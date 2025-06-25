// URL da API
const API_URL = 'http://localhost:5000/api';

// Elementos do DOM
const btnAtualizar = document.getElementById('btnAtualizar');
const btnAnalisar = document.getElementById('btnAnalisar');
const btnGerarJogos = document.getElementById('btnGerarJogos');
const statusAtualizacao = document.getElementById('statusAtualizacao');
const analiseResultado = document.getElementById('analiseResultado');
const volante = document.getElementById('volante');
const jogosResultado = document.getElementById('jogosResultado');

// Criar volante
function criarVolante() {
    volante.innerHTML = '';
    for (let i = 1; i <= 25; i++) {
        const numeroEl = document.createElement('div');
        numeroEl.className = 'numero';
        numeroEl.textContent = i.toString().padStart(2, '0');
        numeroEl.dataset.numero = i;
        volante.appendChild(numeroEl);
    }
}

// Atualizar cores do volante baseado nos atrasos
function atualizarVolante(atrasos) {
    const maxAtraso = Math.max(...atrasos.map(item => item.atraso));
    
    atrasos.forEach(item => {
        const numeroEl = document.querySelector(`.numero[data-numero="${item.dezena}"]`);
        if (numeroEl) {
            const intensidade = item.atraso / maxAtraso;
            const cor = `rgba(128, 0, 128, ${intensidade})`;
            numeroEl.style.backgroundColor = cor;
            numeroEl.style.color = intensidade > 0.5 ? 'white' : 'black';
        }
    });
}

// Mostrar números selecionados no volante
function marcarNumerosSelecionados(numeros) {
    document.querySelectorAll('.numero').forEach(el => {
        el.classList.remove('selecionado');
    });
    
    numeros.forEach(num => {
        const numeroEl = document.querySelector(`.numero[data-numero="${num}"]`);
        if (numeroEl) {
            numeroEl.classList.add('selecionado');
        }
    });
}

// Atualizar dados
btnAtualizar.addEventListener('click', async () => {
    btnAtualizar.disabled = true;
    statusAtualizacao.innerHTML = '<span class="loading"></span> Atualizando dados...';
    
    try {
        const response = await fetch(`${API_URL}/atualizar-dados`);
        const data = await response.json();
        
        if (data.success) {
            statusAtualizacao.innerHTML = `✅ ${data.message}`;
            document.getElementById('ultimoConcurso').textContent = data.ultimo_concurso;
        } else {
            statusAtualizacao.innerHTML = `⚠️ ${data.message}`;
        }
    } catch (error) {
        statusAtualizacao.innerHTML = `⚠️ Erro ao conectar com o servidor: ${error.message}`;
    } finally {
        btnAtualizar.disabled = false;
    }
});

// Gerar análise
btnAnalisar.addEventListener('click', async () => {
    btnAnalisar.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/analise`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('ultimoConcurso').textContent = data.ultimo_concurso;
            document.getElementById('dataUltimoSorteio').textContent = data.data_ultimo_sorteio;
            
            const tbodyAtrasos = document.querySelector('#tabelaAtrasos tbody');
            tbodyAtrasos.innerHTML = '';
            data.atrasos.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.dezena.toString().padStart(2, '0')}</td>
                    <td>${item.atraso}</td>
                `;
                tbodyAtrasos.appendChild(tr);
            });
            
            const tbodyPares = document.querySelector('#tabelaParesFrequentes tbody');
            tbodyPares.innerHTML = '';
            data.pares_mais_frequentes.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.par[0].toString().padStart(2, '0')} e ${item.par[1].toString().padStart(2, '0')}</td>
                    <td>${item.frequencia}</td>
                `;
                tbodyPares.appendChild(tr);
            });
            
            atualizarVolante(data.atrasos);
            analiseResultado.style.display = 'block';
        } else {
            alert(`Erro: ${data.message}`);
        }
    } catch (error) {
        alert(`Erro ao conectar com o servidor: ${error.message}`);
    } finally {
        btnAnalisar.disabled = false;
    }
});

// Gerar jogos
btnGerarJogos.addEventListener('click', async () => {
    btnGerarJogos.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/gerar-jogos`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('concursoAtual').textContent = data.concurso;
            
            const listaJogos = document.getElementById('listaJogos');
            listaJogos.innerHTML = '';
            
            data.jogos.forEach((jogo, index) => {
                const jogoDiv = document.createElement('div');
                jogoDiv.className = 'jogo';
                
                const titulo = document.createElement('h4');
                titulo.textContent = `Jogo ${index + 1}:`;
                jogoDiv.appendChild(titulo);
                
                jogo.forEach(num => {
                    const numEl = document.createElement('div');
                    numEl.className = 'jogo-numero';
                    numEl.textContent = num.toString().padStart(2, '0');
                    jogoDiv.appendChild(numEl);
                });
                
                listaJogos.appendChild(jogoDiv);
            });
            
            const todosNumeros = data.jogos.flat();
            marcarNumerosSelecionados(todosNumeros);
            jogosResultado.style.display = 'block';
        } else {
            alert(`Erro: ${data.message}`);
        }
    } catch (error) {
        alert(`Erro ao conectar com o servidor: ${error.message}`);
    } finally {
        btnGerarJogos.disabled = false;
    }
});

// Inicializar a página
document.addEventListener('DOMContentLoaded', () => {
    criarVolante();
});