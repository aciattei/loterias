# 🎰 Analisador Mega-Sena

Aplicativo web para análise estatística dos sorteios da Mega-Sena.

## 🚀 Como Usar

1. Abra o arquivo `index.html` no navegador
2. Clique em "Carregar Dados da CAIXA"
3. Explore as análises estatísticas
4. Gere jogos inteligentes ou crie jogos manuais
5. Confira seus jogos contra o último sorteio

## ⚠️ Problema de CORS

O navegador pode bloquear o download direto da planilha da CAIXA devido a políticas de segurança CORS (Cross-Origin Resource Sharing).

### Solução 1: Usar Servidor Local

Rode o aplicativo através de um servidor HTTP local:

**Opção A - Python:**
```bash
# Python 3
python -m http.server 8000

# Depois acesse: http://localhost:8000
```

**Opção B - Node.js:**
```bash
# Instalar http-server globalmente
npm install -g http-server

# Executar
http-server -p 8000

# Acesse: http://localhost:8000
```

**Opção C - VS Code:**
- Instale a extensão "Live Server"
- Clique com botão direito no `index.html`
- Selecione "Open with Live Server"

### Solução 2: Extensão do Navegador

Instale uma extensão para desabilitar CORS temporariamente:

**Chrome/Edge:**
- "Allow CORS: Access-Control-Allow-Origin"
- "CORS Unblock"

**Firefox:**
- "CORS Everywhere"

⚠️ **IMPORTANTE**: Desative essas extensões após usar o aplicativo!

### Solução 3: Dados Simulados (Fallback)

Se o download falhar por CORS, o aplicativo automaticamente usa dados simulados para demonstração.

## 📊 Funcionalidades

### 1. Carregamento de Dados
- Download automático da planilha oficial da CAIXA
- URL: `https://servicebus2.caixa.gov.br/portaldeloterias/api/resultados/download?modalidade=Mega-Sena`
- Extração automática de arquivos ZIP
- Parsing de arquivos Excel (.xlsx)

### 2. Análise Estatística
- Análise dos sorteios do ano atual
- Números mais sorteados
- Números menos sorteados
- Estatísticas detalhadas por número (hover)
  - Quantidade de vezes sorteado
  - Concursos sem ser sorteado
  - Co-ocorrências mais frequentes
  - Co-ocorrências menos frequentes

### 3. Geração Inteligente de Jogos
- Estratégia mista: combina números "quentes" com números "atrasados"
- Configurável: 1-20 jogos, 6-15 números por jogo
- Salvamento automático no navegador (localStorage)

### 4. Jogo Manual
- Seleção visual de números (1-60)
- Validação automática (6-15 números)
- Interface intuitiva

### 5. Conferência de Resultados
- Confere todos os jogos salvos
- Destaca acertos em verde
- Identifica QUADRA, QUINA e SENA
- Mostra quantidade de acertos por jogo

## 🛠️ Tecnologias

- **HTML5/CSS3**: Interface moderna e responsiva
- **JavaScript ES6+**: Lógica da aplicação
- **JSZip**: Extração de arquivos ZIP
- **SheetJS (XLSX)**: Leitura de planilhas Excel
- **LocalStorage**: Persistência de dados no navegador

## 🔍 Debug

Abra o Console do Navegador (F12) para ver logs detalhados:
- Download do arquivo
- Extração do ZIP
- Leitura da planilha
- Processamento dos dados
- Estrutura dos headers
- Quantidade de concursos processados

## 📝 Estrutura de Dados

O aplicativo espera uma planilha com as seguintes colunas:
- **Concurso**: Número do concurso
- **Data Sorteio**: Data do sorteio
- **Bola1** a **Bola6**: Números sorteados (1-60)

## 🎨 Interface

- Design moderno com gradientes
- Totalmente responsivo (mobile-friendly)
- Animações suaves
- Tooltips informativos
- Feedback visual claro

## 💾 Armazenamento

Todos os jogos (gerados e manuais) são salvos automaticamente no `localStorage` do navegador e permanecem disponíveis mesmo após fechar a página.

## 🐛 Solução de Problemas

### "Planilha vazia ou sem dados"
- Verifique se o arquivo foi baixado corretamente (veja logs no console)
- Tente rodar através de um servidor local
- Use extensão para desabilitar CORS

### "ERRO: Failed to fetch"
- Problema de CORS - use uma das soluções acima
- Verifique sua conexão com a internet
- O aplicativo usará dados simulados automaticamente

### Números não aparecem
- Verifique se clicou em "Carregar Dados da CAIXA"
- Abra o console (F12) e procure por erros
- Recarregue a página (F5)

## 📄 Licença

Projeto educacional - Use livremente!

## 🎯 Aviso Legal

Este é um aplicativo de análise estatística para fins educacionais. Os números gerados são baseados em estatísticas passadas e não garantem ganhos futuros. Jogue com responsabilidade!
