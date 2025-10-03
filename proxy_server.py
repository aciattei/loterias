#!/usr/bin/env python3
"""
Servidor proxy simples para contornar problemas de CORS
ao baixar dados da CAIXA para o aplicativo Mega-Sena Analyzer
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import json
import sys

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Adicionar headers CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Se for requisição para /api/megasena, fazer proxy para CAIXA
        if self.path == '/api/megasena':
            try:
                print('🔄 Fazendo proxy para CAIXA...')
                url = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/resultados/download?modalidade=Mega-Sena'
                
                req = urllib.request.Request(
                    url,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                )
                
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                    self.send_header('Content-Length', len(data))
                    self.end_headers()
                    self.wfile.write(data)
                    
                    print(f'✅ Arquivo baixado: {len(data)} bytes')
                    
            except Exception as e:
                print(f'❌ Erro ao baixar: {e}')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': str(e),
                    'message': 'Falha ao baixar dados da CAIXA'
                })
                self.wfile.write(error_response.encode())
        else:
            # Para outros arquivos, servir normalmente
            super().do_GET()

    def log_message(self, format, *args):
        # Log customizado
        print(f'📡 {self.address_string()} - {format % args}')


def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    
    print('=' * 60)
    print('🎰 Servidor Proxy Mega-Sena Analyzer')
    print('=' * 60)
    print(f'\n✅ Servidor rodando em: http://localhost:{port}')
    print(f'\n📝 Instruções:')
    print(f'   1. Abra seu navegador')
    print(f'   2. Acesse: http://localhost:{port}')
    print(f'   3. Use o aplicativo normalmente')
    print(f'\n🔗 Endpoint proxy: http://localhost:{port}/api/megasena')
    print(f'\n⚠️  Pressione Ctrl+C para parar o servidor\n')
    print('=' * 60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n🛑 Servidor parado pelo usuário')
        httpd.shutdown()
        sys.exit(0)


if __name__ == '__main__':
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print('❌ Porta inválida. Usando porta padrão 8000')
    
    run_server(port)

