from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime
from itertools import combinations
from collections import Counter
from random import sample
from statsmodels.tsa.holtwinters import ExponentialSmoothing

app = Flask(__name__)
CORS(app)

# Configurações
pasta_trabalho = os.path.join(os.path.expanduser('~'), 'Documents', 'lotofacil_data')
os.makedirs(pasta_trabalho, exist_ok=True)

arquivo_csv = os.path.join(pasta_trabalho, "lotofacil_base.csv")
arquivo_jogos = os.path.join(pasta_trabalho, "lotofacil_sugeridos.csv")

@app.route('/api/atualizar-dados', methods=['GET'])
def atualizar_dados():
    try:
        url = "https://servicebus2.caixa.gov.br/portaldeloterias/api/resultados/download?modalidade=Lotofacil"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            df_novo = pd.read_excel(response.content, engine='openpyxl')
            df_novo.columns = [col.strip().upper() for col in df_novo.columns]
            
            try:
                df_existente = pd.read_csv(arquivo_csv)
                df_final = pd.concat([df_existente, df_novo]).drop_duplicates(subset=["CONCURSO"], keep="last")
            except FileNotFoundError:
                df_final = df_novo
            
            df_final = df_final.sort_values("CONCURSO")
            df_final.to_csv(arquivo_csv, index=False, encoding="utf-8-sig")
            
            return jsonify({
                "success": True,
                "message": f"Base atualizada com {len(df_final)} concursos",
                "ultimo_concurso": int(df_final['CONCURSO'].iloc[-1])
            })
        else:
            return jsonify({
                "success": False,
                "message": f"Erro ao baixar dados: HTTP {response.status_code}"
            }), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Falha na conexão: {str(e)}"
        }), 500

@app.route('/api/analise', methods=['GET'])
def get_analise():
    try:
        df = pd.read_csv(arquivo_csv)
        df.columns = [col.strip().upper() for col in df.columns]
        
        # Cálculo de atrasos
        todas_dezenas = list(range(1, 26))
        col_bolas = [f'BOLA{i}' for i in range(1, 16)]
        todas_bolas = df[col_bolas]
        
        ultima_ocorrencia = {
            dezena: df['CONCURSO'][todas_bolas.isin([dezena]).any(axis=1)].iloc[-1]
            if not df['CONCURSO'][todas_bolas.isin([dezena]).any(axis=1)].empty else 0
            for dezena in todas_dezenas
        }
        
        ultimo_concurso = df['CONCURSO'].max()
        df_atrasos = pd.DataFrame({
            'dezena': list(ultima_ocorrencia.keys()),
            'atraso': [ultimo_concurso - ultima_ocorrencia[d] for d in todas_dezenas]
        }).sort_values(by='atraso', ascending=False)
        
        # Pares mais frequentes
        pares_todos_concursos = [
            par for _, row in df[col_bolas].iterrows() for par in combinations(sorted(row.values), 2)
        ]
        contador_pares = Counter(pares_todos_concursos)
        df_pares = pd.DataFrame(contador_pares.items(), columns=['par', 'frequencia']).sort_values(by='frequencia', ascending=False)
        
        return jsonify({
            "success": True,
            "atrasos": df_atrasos.head(15).to_dict('records'),
            "pares_mais_frequentes": df_pares.head(10).to_dict('records'),
            "pares_menos_frequentes": df_pares.tail(10).to_dict('records'),
            "ultimo_concurso": int(df['CONCURSO'].iloc[-1]),
            "data_ultimo_sorteio": df['DATA SORTEIO'].iloc[-1]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erro ao processar análise: {str(e)}"
        }), 500

@app.route('/api/gerar-jogos', methods=['POST'])
def gerar_jogos():
    try:
        df = pd.read_csv(arquivo_csv)
        df.columns = [col.strip().upper() for col in df.columns]
        
        # Determinar próximo concurso
        if os.path.exists(arquivo_jogos):
            df_jogos_salvos = pd.read_csv(arquivo_jogos)
            if 'Concurso' in df_jogos_salvos.columns:
                concurso_proximo = df_jogos_salvos['Concurso'].max() + 1
            else:
                concurso_proximo = 1
        else:
            concurso_proximo = 1
        
        # Verificar se já existem jogos para este concurso
        if os.path.exists(arquivo_jogos):
            df_jogos_salvos = pd.read_csv(arquivo_jogos)
            if 'Concurso' in df_jogos_salvos.columns and concurso_proximo in df_jogos_salvos['Concurso'].values:
                jogos_existentes = df_jogos_salvos[df_jogos_salvos['Concurso'] == concurso_proximo]
                jogos = jogos_existentes.drop(columns='Concurso').apply(
                    lambda row: sorted(row.dropna().astype(int).tolist()), axis=1
                ).tolist()
                
                return jsonify({
                    "success": True,
                    "jogos": jogos,
                    "concurso": int(concurso_proximo),
                    "message": "Jogos já gerados anteriormente"
                })
        
        # Se não existirem jogos, gerar novos
        col_bolas = [f'BOLA{i}' for i in range(1, 16)]
        todas_bolas = df[col_bolas]
        
        # Cálculo de atrasos
        todas_dezenas = list(range(1, 26))
        ultima_ocorrencia = {
            dezena: df['CONCURSO'][todas_bolas.isin([dezena]).any(axis=1)].iloc[-1]
            if not df['CONCURSO'][todas_bolas.isin([dezena]).any(axis=1)].empty else 0
            for dezena in todas_dezenas
        }
        
        ultimo_concurso = df['CONCURSO'].max()
        df_atrasos = pd.DataFrame({
            'dezena': list(ultima_ocorrencia.keys()),
            'atraso': [ultimo_concurso - ultima_ocorrencia[d] for d in todas_dezenas]
        }).set_index('dezena').sort_values(by='atraso', ascending=False)
        
        # Forecast de tendência
        dezenas = list(range(1, 26))
        serie_por_dezena = {dez: [] for dez in dezenas}
        
        for _, row in df.iterrows():
            dezenas_sorteadas = set(row[col_bolas])
            for dez in dezenas:
                serie_por_dezena[dez].append(1 if dez in dezenas_sorteadas else 0)
        
        forecast_scores = {}
        for dez in dezenas:
            serie = pd.Series(serie_por_dezena[dez])
            if serie.sum() > 0:
                modelo = ExponentialSmoothing(serie, trend=None, seasonal=None, initialization_method="estimated")
                ajuste = modelo.fit()
                previsao = ajuste.forecast(1).iloc[0]
                forecast_scores[dez] = previsao
            else:
                forecast_scores[dez] = 0
        
        # Gerar jogos
        top_dezenas = df_atrasos.head(20).index.tolist()
        jogos_sugeridos = [sorted(sample(top_dezenas, 15)) for _ in range(4)]
        
        # Salvar jogos
        df_novos_jogos = pd.DataFrame(jogos_sugeridos)
        df_novos_jogos.insert(0, 'Concurso', concurso_proximo)
        
        if os.path.exists(arquivo_jogos):
            df_novos_jogos.to_csv(arquivo_jogos, mode='a', index=False, header=False, encoding="utf-8-sig")
        else:
            df_novos_jogos.to_csv(arquivo_jogos, index=False, encoding="utf-8-sig")
        
        return jsonify({
            "success": True,
            "jogos": jogos_sugeridos,
            "concurso": int(concurso_proximo),
            "message": "Novos jogos gerados com sucesso"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erro ao gerar jogos: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)