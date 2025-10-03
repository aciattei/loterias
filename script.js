class MegaSenaApp {
    constructor() {
        this.allDraws = [];
        this.currentYearDraws = [];
        this.stats = {};
        this.savedGames = JSON.parse(localStorage.getItem('megaSenaGames')) || [];
        this.selectedNumbers = [];
        
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('btnLoadData').addEventListener('click', () => this.loadData());
        document.getElementById('btnGenerate').addEventListener('click', () => this.generateGames());
        document.getElementById('btnSaveManual').addEventListener('click', () => this.saveManualGame());
        document.getElementById('btnClearSelection').addEventListener('click', () => this.clearSelection());
        document.getElementById('btnCheck').addEventListener('click', () => this.checkGames());
    }

    async loadData() {
        const statusEl = document.getElementById('loadStatus');
        const btnLoad = document.getElementById('btnLoadData');
        
        try {
            btnLoad.disabled = true;
            statusEl.textContent = 'Baixando dados da CAIXA...';
            statusEl.className = 'status loading';
            
            // Tentar baixar da CAIXA
            try {
                await this.downloadAndParseExcel();
            } catch (downloadError) {
                console.error('Erro ao baixar da CAIXA:', downloadError);
                
                // Se falhar por CORS ou outro erro, usar dados simulados
                if (downloadError.message.includes('CORS') || 
                    downloadError.message.includes('Failed to fetch') ||
                    downloadError.message.includes('NetworkError')) {
                    statusEl.textContent = 'Download bloqueado por CORS. Usando dados simulados...';
                    statusEl.className = 'status loading';
                    await this.loadSimulatedData();
                } else {
                    throw downloadError;
                }
            }
            
            statusEl.textContent = `Dados carregados com sucesso! ${this.allDraws.length} concursos encontrados.`;
            statusEl.className = 'status success';
            
            this.displayDataInfo();
            this.analyzeNumbers();
            this.displayAnalysis();
            this.showAllSections();
            this.displaySavedGames();
            
        } catch (error) {
            statusEl.textContent = `ERRO: ${error.message}`;
            statusEl.className = 'status error';
            console.error('Erro ao carregar dados:', error);
            console.error('Stack:', error.stack);
        } finally {
            btnLoad.disabled = false;
        }
    }

    async downloadAndParseExcel() {
        // Estratégia 1: Tentar API JSON da CAIXA (mais simples)
        try {
            console.log('🎯 Estratégia 1: Tentando API JSON...');
            await this.loadFromJsonApi();
            return;
        } catch (jsonError) {
            console.warn('❌ API JSON falhou:', jsonError.message);
        }
        
        // Estratégia 2: Tentar proxy local, depois URL direta do Excel
        const urls = [
            'http://localhost:8000/api/megasena',  // Proxy local
            'https://servicebus2.caixa.gov.br/portaldeloterias/api/resultados/download?modalidade=Mega-Sena'  // URL direta
        ];
        
        let lastError = null;
        
        for (const url of urls) {
            try {
                console.log(`🎯 Estratégia 2: Tentando Excel de ${url}...`);
                return await this.tryDownload(url);
            } catch (error) {
                console.warn(`❌ Falha em ${url}:`, error.message);
                lastError = error;
            }
        }
        
        throw lastError || new Error('Falha em todas as tentativas de download');
    }

    async loadFromJsonApi() {
        console.log('🌐 Carregando últimos concursos via API JSON da CAIXA...');
        
        // Primeiro, buscar o último concurso (API sem número retorna o último)
        let lastConcurso = null;
        try {
            const response = await fetch('https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena');
            if (response.ok) {
                const data = await response.json();
                lastConcurso = data.numero;
                console.log(`📍 Último concurso detectado: ${lastConcurso}`);
            }
        } catch (e) {
            console.warn('Não conseguiu detectar último concurso, usando estimativa');
        }
        
        // Se não conseguiu, usar estimativa
        if (!lastConcurso) {
            lastConcurso = 2800; // Estimativa
        }
        
        // Buscar os últimos 100 concursos
        console.log(`📥 Baixando concursos ${lastConcurso - 99} até ${lastConcurso}...`);
        
        const promises = [];
        for (let i = 0; i < 100; i++) {
            const concursoNum = lastConcurso - i;
            promises.push(
                fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concursoNum}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
            );
        }
        
        const results = await Promise.all(promises);
        
        const draws = results
            .filter(r => r && r.numero && r.listaDezenas && r.listaDezenas.length === 6)
            .map(r => {
                // Processar data
                let dataObj = new Date();
                if (r.dataApuracao) {
                    dataObj = new Date(r.dataApuracao);
                }
                
                return {
                    concurso: r.numero,
                    data: dataObj,
                    ano: dataObj.getFullYear(),
                    bolas: r.listaDezenas.map(n => String(n).padStart(2, '0'))
                };
            });
        
        if (draws.length === 0) {
            throw new Error('Nenhum concurso encontrado via API JSON');
        }
        
        console.log(`✅ ${draws.length} concursos carregados com sucesso via API JSON!`);
        
        draws.sort((a, b) => a.concurso - b.concurso);
        this.allDraws = draws;
        
        const currentYear = new Date().getFullYear();
        this.currentYearDraws = draws.filter(d => d.ano === currentYear);
        
        if (this.currentYearDraws.length === 0) {
            console.warn('⚠️  Nenhum sorteio do ano atual, usando últimos 50');
            this.currentYearDraws = draws.slice(-50);
        }
        
        console.log(`📊 Análise: ${this.currentYearDraws.length} sorteios do ano ${currentYear}`);
    }

    async tryDownload(url) {
        console.log('Baixando de:', url);
        
        const response = await fetch(url, { 
            mode: 'cors',
            headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/zip, */*'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Falha no download: HTTP ${response.status}`);
        }
        
        console.log('Content-Type:', response.headers.get('content-type'));
        console.log('Content-Disposition:', response.headers.get('content-disposition'));
        
        const blob = await response.blob();
        console.log('Blob size:', blob.size, 'bytes');
        console.log('Blob type:', blob.type);
        
        let arrayBuffer;
        
        // Verificar se é ZIP e extrair
        if (blob.type.includes('zip') || blob.type === 'application/octet-stream' || blob.size > 100000) {
            console.log('Tentando extrair como ZIP...');
            if (typeof JSZip === 'undefined') {
                throw new Error('Biblioteca JSZip não carregada');
            }
            
            try {
                const zip = await JSZip.loadAsync(blob);
                console.log('Arquivos no ZIP:', Object.keys(zip.files));
                
                const xlsxFile = Object.keys(zip.files).find(name => 
                    name.toLowerCase().endsWith('.xlsx') || 
                    name.toLowerCase().endsWith('.xls')
                ) || Object.keys(zip.files)[0];
                
                console.log('Usando arquivo:', xlsxFile);
                
                if (!xlsxFile) {
                    throw new Error('Nenhum arquivo Excel encontrado no ZIP');
                }
                
                arrayBuffer = await zip.file(xlsxFile).async('arraybuffer');
                console.log('ArrayBuffer extraído, tamanho:', arrayBuffer.byteLength);
            } catch (zipError) {
                console.log('Não é um ZIP válido, tentando ler como Excel direto');
                arrayBuffer = await blob.arrayBuffer();
            }
        } else {
            console.log('Lendo como arquivo direto...');
            arrayBuffer = await blob.arrayBuffer();
        }
        
        // Ler Excel
        if (typeof XLSX === 'undefined') {
            throw new Error('Biblioteca XLSX não carregada');
        }
        
        console.log('Lendo workbook...');
        const workbook = XLSX.read(arrayBuffer, { 
            type: 'array', 
            cellDates: true,
            cellNF: false,
            cellText: false
        });
        
        console.log('Planilhas disponíveis:', workbook.SheetNames);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        console.log('Range da planilha:', worksheet['!ref']);
        
        // Tentar diferentes métodos de leitura
        let data = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            defval: '',
            blankrows: false
        });
        
        console.log('Total de linhas lidas:', data.length);
        console.log('Primeiras 5 linhas:', data.slice(0, 5));
        
        // Filtrar linhas completamente vazias
        data = data.filter(row => row && row.length > 0 && row.some(cell => cell !== ''));
        
        console.log('Linhas após filtrar vazias:', data.length);
        
        if (!data || data.length < 2) {
            throw new Error('Planilha vazia ou sem dados suficientes. Linhas encontradas: ' + data.length);
        }
        
        this.parseDrawsData(data);
    }

    parseDrawsData(data) {
        console.log('Total de linhas:', data.length);
        
        if (!data || data.length === 0) {
            throw new Error('Dados vazios recebidos para parseamento');
        }
        
        console.log('Primeira linha (headers):', data[0]);
        
        if (!data[0] || !Array.isArray(data[0])) {
            throw new Error('Primeira linha não é um array válido');
        }
        
        const headers = data[0].map(h => h ? String(h).toLowerCase().trim() : '');
        console.log('Headers processados:', headers);
        
        // Encontrar índices das colunas com mais flexibilidade
        const idxConcurso = headers.findIndex(h => h.includes('concurso'));
        
        // Tentar várias combinações para data
        let idxData = headers.findIndex(h => h.includes('data') && h.includes('sorteio'));
        if (idxData === -1) {
            idxData = headers.findIndex(h => h.includes('data sorteio'));
        }
        if (idxData === -1) {
            idxData = headers.findIndex(h => h.includes('datasorteio'));
        }
        if (idxData === -1) {
            idxData = headers.findIndex(h => h.includes('data'));
        }
        
        // Procurar colunas de bolas com mais flexibilidade
        const idxBola1 = headers.findIndex(h => h && (h.match(/bola\s*1|dezena\s*1|^1[ªº]?\s*bola/) || h === 'bola1'));
        const idxBola2 = headers.findIndex(h => h && (h.match(/bola\s*2|dezena\s*2|^2[ªº]?\s*bola/) || h === 'bola2'));
        const idxBola3 = headers.findIndex(h => h && (h.match(/bola\s*3|dezena\s*3|^3[ªº]?\s*bola/) || h === 'bola3'));
        const idxBola4 = headers.findIndex(h => h && (h.match(/bola\s*4|dezena\s*4|^4[ªº]?\s*bola/) || h === 'bola4'));
        const idxBola5 = headers.findIndex(h => h && (h.match(/bola\s*5|dezena\s*5|^5[ªº]?\s*bola/) || h === 'bola5'));
        const idxBola6 = headers.findIndex(h => h && (h.match(/bola\s*6|dezena\s*6|^6[ªº]?\s*bola/) || h === 'bola6'));
        
        console.log('Índices encontrados:', {
            concurso: idxConcurso,
            data: idxData,
            bola1: idxBola1,
            bola2: idxBola2,
            bola3: idxBola3,
            bola4: idxBola4,
            bola5: idxBola5,
            bola6: idxBola6
        });
        
        if (idxConcurso === -1) {
            throw new Error('Coluna "Concurso" não encontrada. Headers disponíveis: ' + headers.join(', '));
        }
        
        if (idxBola1 === -1) {
            throw new Error('Colunas de bolas não encontradas. Headers disponíveis: ' + headers.join(', '));
        }
        
        const draws = [];
        const currentYear = new Date().getFullYear();
        let processedCount = 0;
        
        for (let i = 1; i < data.length; i++) {
            try {
                const row = data[i];
                if (!row || !Array.isArray(row) || row.length === 0) continue;
                
                // Verificar se tem dados suficientes
                if (row.length < Math.max(idxConcurso, idxBola1, idxBola2, idxBola3, idxBola4, idxBola5, idxBola6) + 1) {
                    continue;
                }
                
                const concurso = parseInt(row[idxConcurso], 10);
                if (!Number.isFinite(concurso) || concurso <= 0) continue;
                
                // Processar data com mais robustez
                let dataObj = null;
                const rawData = idxData >= 0 ? row[idxData] : null;
                
                if (rawData) {
                    if (typeof rawData === 'number') {
                        // Data em formato Excel (número serial)
                        dataObj = new Date((rawData - 25569) * 86400 * 1000);
                    } else if (rawData instanceof Date) {
                        dataObj = rawData;
                    } else {
                        const dataStr = String(rawData);
                        if (dataStr.includes('/')) {
                            const parts = dataStr.split('/');
                            if (parts.length === 3) {
                                dataObj = new Date(parts[2], parts[1] - 1, parts[0]);
                            }
                        } else if (dataStr.includes('-')) {
                            dataObj = new Date(dataStr);
                        }
                    }
                }
                
                // Se não conseguiu processar data, usar data atual (fallback)
                if (!dataObj || isNaN(dataObj.getTime())) {
                    dataObj = new Date();
                }
                
                // Coletar bolas com validação
                const bolas = [
                    row[idxBola1], row[idxBola2], row[idxBola3],
                    row[idxBola4], row[idxBola5], row[idxBola6]
                ].map(b => {
                    if (b === null || b === undefined || b === '') return null;
                    const num = parseInt(String(b).replace(/\D/g, ''), 10);
                    return (Number.isFinite(num) && num >= 1 && num <= 60) ? String(num).padStart(2, '0') : null;
                }).filter(b => b !== null);
                
                if (bolas.length === 6) {
                    const draw = {
                        concurso,
                        data: dataObj,
                        ano: dataObj.getFullYear(),
                        bolas
                    };
                    draws.push(draw);
                    processedCount++;
                }
            } catch (rowError) {
                console.warn(`Erro ao processar linha ${i}:`, rowError.message);
                continue;
            }
        }
        
        console.log('Sorteios processados:', processedCount);
        
        if (draws.length === 0) {
            throw new Error('Nenhum sorteio válido foi processado. Verifique o formato da planilha.');
        }
        
        draws.sort((a, b) => a.concurso - b.concurso);
        
        this.allDraws = draws;
        this.currentYearDraws = draws.filter(d => d.ano === currentYear);
        
        console.log('Total de sorteios:', draws.length);
        console.log('Sorteios do ano atual:', this.currentYearDraws.length);
        
        if (this.currentYearDraws.length === 0) {
            // Se não houver sorteios do ano atual, usar os últimos 50
            console.warn('Nenhum sorteio do ano atual, usando os últimos 50 sorteios');
            this.currentYearDraws = draws.slice(-50);
        }
    }

    async loadSimulatedData() {
        console.log('Gerando dados simulados para demonstração...');
        
        const draws = [];
        const currentYear = new Date().getFullYear();
        const startConcurso = 2700; // Número base de concurso
        
        // Gerar 100 sorteios simulados
        for (let i = 0; i < 100; i++) {
            const date = new Date(currentYear, 0, 1);
            date.setDate(date.getDate() + (i * 3)); // A cada 3 dias
            
            // Gerar 6 números aleatórios únicos entre 1 e 60
            const bolas = [];
            while (bolas.length < 6) {
                const num = Math.floor(Math.random() * 60) + 1;
                if (!bolas.includes(num)) {
                    bolas.push(num);
                }
            }
            bolas.sort((a, b) => a - b);
            
            draws.push({
                concurso: startConcurso + i,
                data: date,
                ano: date.getFullYear(),
                bolas: bolas.map(n => String(n).padStart(2, '0'))
            });
        }
        
        this.allDraws = draws;
        this.currentYearDraws = draws.filter(d => d.ano === currentYear);
        
        console.log('Dados simulados gerados:', this.allDraws.length, 'concursos');
    }

    displayDataInfo() {
        if (!this.allDraws || this.allDraws.length === 0) {
            throw new Error('Nenhum dado disponível para exibir');
        }
        
        const lastDraw = this.allDraws[this.allDraws.length - 1];
        const years = [...new Set(this.allDraws.map(d => d.ano))].sort();
        const oldestYear = Math.min(...years);
        const currentYear = new Date().getFullYear();
        
        document.getElementById('lastConcurso').textContent = lastDraw.concurso;
        document.getElementById('totalYearDraws').textContent = 
            `${this.allDraws.length} (${oldestYear} - ${currentYear}, com peso para anos recentes)`;
        document.getElementById('dataInfo').classList.remove('hidden');
    }

    analyzeNumbers() {
        this.stats = {};
        
        // Inicializar stats para números 1-60
        for (let num = 1; num <= 60; num++) {
            this.stats[num] = {
                count: 0,
                weightedCount: 0,
                lastDrawn: null,
                drawsSinceLastDrawn: this.allDraws.length,
                coOccurrences: {},
                weightedCoOccurrences: {}
            };
        }
        
        // Calcular pesos por ano
        const currentYear = new Date().getFullYear();
        const yearWeights = this.calculateYearWeights(currentYear);
        
        console.log('Pesos por ano:', yearWeights);
        
        // Analisar TODOS os sorteios com pesos
        this.allDraws.forEach((draw, index) => {
            const yearDiff = currentYear - draw.ano;
            const weight = yearWeights[yearDiff] || 0.1; // Peso mínimo para anos muito antigos
            
            draw.bolas.forEach(bolaStr => {
                const num = parseInt(bolaStr, 10);
                this.stats[num].count++;
                this.stats[num].weightedCount += weight;
                this.stats[num].lastDrawn = draw.concurso;
                this.stats[num].drawsSinceLastDrawn = this.allDraws.length - index - 1;
                
                // Co-ocorrências
                draw.bolas.forEach(otherBolaStr => {
                    const otherNum = parseInt(otherBolaStr, 10);
                    if (otherNum !== num) {
                        if (!this.stats[num].coOccurrences[otherNum]) {
                            this.stats[num].coOccurrences[otherNum] = 0;
                        }
                        this.stats[num].coOccurrences[otherNum]++;
                        
                        // Co-ocorrências ponderadas
                        if (!this.stats[num].weightedCoOccurrences[otherNum]) {
                            this.stats[num].weightedCoOccurrences[otherNum] = 0;
                        }
                        this.stats[num].weightedCoOccurrences[otherNum] += weight;
                    }
                });
            });
        });
    }
    
    calculateYearWeights(currentYear) {
        // Encontrar o range de anos nos dados
        const years = [...new Set(this.allDraws.map(d => d.ano))].sort();
        const oldestYear = Math.min(...years);
        const maxYearDiff = currentYear - oldestYear;
        
        // Criar mapa de pesos usando função exponencial
        // Peso = e^(-k * yearDiff)
        // onde k controla a taxa de decaimento (menor k = decaimento mais suave)
        const k = 0.15; // Ajuste este valor para controlar o decaimento (0.1 a 0.3 são bons valores)
        
        const weights = {};
        for (let yearDiff = 0; yearDiff <= maxYearDiff; yearDiff++) {
            // Peso exponencial: ano atual tem peso 1, anos anteriores decaem exponencialmente
            weights[yearDiff] = Math.exp(-k * yearDiff);
        }
        
        return weights;
    }

    displayAnalysis() {
        // Números mais sorteados (usando contagem ponderada)
        const sorted = Object.entries(this.stats)
            .map(([num, data]) => ({ 
                num: parseInt(num), 
                count: data.count,
                weightedCount: data.weightedCount 
            }))
            .sort((a, b) => b.weightedCount - a.weightedCount);
        
        const mostDrawn = sorted.slice(0, 10);
        const leastDrawn = sorted.slice(-10).reverse();
        
        const mostDrawnEl = document.getElementById('mostDrawnNumbers');
        mostDrawnEl.innerHTML = mostDrawn
            .map(item => `<span class="number-badge">${item.num} (${item.count}x, peso: ${item.weightedCount.toFixed(1)})</span>`)
            .join('');
        
        const leastDrawnEl = document.getElementById('leastDrawnNumbers');
        leastDrawnEl.innerHTML = leastDrawn
            .map(item => `<span class="number-badge">${item.num} (${item.count}x, peso: ${item.weightedCount.toFixed(1)})</span>`)
            .join('');
        
        // Grid de todos os números
        this.displayAllNumbers();
    }

    displayAllNumbers() {
        const grid = document.getElementById('allNumbersGrid');
        grid.innerHTML = '';
        
        for (let num = 1; num <= 60; num++) {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = String(num).padStart(2, '0');
            cell.dataset.number = num;
            
            // Adicionar evento de hover
            cell.addEventListener('mouseenter', (e) => this.showTooltip(e, num));
            cell.addEventListener('mouseleave', () => this.hideTooltip());
            
            grid.appendChild(cell);
        }
        
        // Grid para seleção manual
        const manualGrid = document.getElementById('manualGrid');
        manualGrid.innerHTML = '';
        
        for (let num = 1; num <= 60; num++) {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = String(num).padStart(2, '0');
            cell.dataset.number = num;
            
            cell.addEventListener('click', () => this.toggleNumber(num, cell));
            
            manualGrid.appendChild(cell);
        }
    }

    showTooltip(event, num) {
        const tooltip = document.getElementById('tooltip');
        const stats = this.stats[num];
        
        // Encontrar co-ocorrências mais e menos frequentes (usando ponderação)
        const coOccArr = Object.entries(stats.weightedCoOccurrences)
            .sort((a, b) => b[1] - a[1]);
        
        const mostFrequent = coOccArr[0] || null;
        const leastFrequent = coOccArr[coOccArr.length - 1] || null;
        
        tooltip.innerHTML = `
            <div><strong>Número ${num}</strong></div>
            <div>Sorteado: ${stats.count} vez(es) em ${this.allDraws.length} concursos</div>
            <div>Peso ponderado: ${stats.weightedCount.toFixed(2)}</div>
            <div>Há ${stats.drawsSinceLastDrawn} concurso(s) sem ser sorteado</div>
            ${mostFrequent ? `<div>Mais sorteado com: ${mostFrequent[0]} (peso: ${parseFloat(mostFrequent[1]).toFixed(1)})</div>` : '<div>Sem co-ocorrências</div>'}
            ${leastFrequent && leastFrequent !== mostFrequent ? `<div>Menos sorteado com: ${leastFrequent[0]} (peso: ${parseFloat(leastFrequent[1]).toFixed(1)})</div>` : ''}
        `;
        
        tooltip.classList.remove('hidden');
        
        // Posicionar tooltip
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
    }

    hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    }

    toggleNumber(num, cell) {
        const index = this.selectedNumbers.indexOf(num);
        
        if (index > -1) {
            this.selectedNumbers.splice(index, 1);
            cell.classList.remove('selected');
            } else {
            if (this.selectedNumbers.length >= 15) {
                alert('Máximo de 15 números por jogo!');
                return;
            }
            this.selectedNumbers.push(num);
            cell.classList.add('selected');
        }
        
        this.updateSelectedDisplay();
    }

    updateSelectedDisplay() {
        const display = document.getElementById('selectedNumbers');
        display.innerHTML = '';
        
        this.selectedNumbers.sort((a, b) => a - b).forEach(num => {
            const span = document.createElement('span');
            span.className = 'selected-number';
            span.textContent = String(num).padStart(2, '0');
            display.appendChild(span);
        });
    }

    clearSelection() {
        this.selectedNumbers = [];
        document.querySelectorAll('#manualGrid .number-cell').forEach(cell => {
            cell.classList.remove('selected');
        });
        this.updateSelectedDisplay();
    }

    generateGames() {
        const numGames = parseInt(document.getElementById('numGames').value, 10);
        const numNumbers = parseInt(document.getElementById('numNumbers').value, 10);
        
        if (numGames < 1 || numGames > 20) {
            alert('Quantidade de jogos deve ser entre 1 e 20');
            return;
        }
        
        if (numNumbers < 6 || numNumbers > 15) {
            alert('Quantidade de números deve ser entre 6 e 15');
            return;
        }
        
        const games = [];
        
        for (let i = 0; i < numGames; i++) {
            const numbers = this.generateSmartGame(numNumbers);
            games.push({
                id: Date.now() + i,
                numbers,
                type: 'gerado',
                date: new Date().toLocaleString('pt-BR')
            });
        }
        
        this.savedGames.push(...games);
        this.saveToLocalStorage();
        this.displayGeneratedGames(games);
        this.displaySavedGames();
        
        alert(`${numGames} jogo(s) gerado(s) e salvos com sucesso!`);
    }

    generateSmartGame(count) {
        // Estratégia: mesclar números quentes (com maior peso ponderado) com números frios (há muito tempo sem sair)
        const sorted = Object.entries(this.stats)
            .map(([num, data]) => ({ 
                num: parseInt(num), 
                weightedCount: data.weightedCount,
                drawsSince: data.drawsSinceLastDrawn
            }))
            .sort((a, b) => b.weightedCount - a.weightedCount);
        
        const hot = sorted.slice(0, 20).map(x => x.num); // Top 20 mais sorteados (ponderado)
        const cold = sorted.sort((a, b) => b.drawsSince - a.drawsSince).slice(0, 20).map(x => x.num); // Top 20 há mais tempo sem sair
        
        const pool = [...new Set([...hot, ...cold])]; // Unir sem duplicatas
        
        // Selecionar aleatoriamente do pool
        const selected = [];
        const available = [...pool];
        
        while (selected.length < count && available.length > 0) {
            const randomIndex = Math.floor(Math.random() * available.length);
            selected.push(available.splice(randomIndex, 1)[0]);
        }
        
        // Se não tiver números suficientes, completar com aleatórios
        while (selected.length < count) {
            const num = Math.floor(Math.random() * 60) + 1;
            if (!selected.includes(num)) {
                selected.push(num);
            }
        }
        
        return selected.sort((a, b) => a - b);
    }

    displayGeneratedGames(games) {
        const container = document.getElementById('generatedGames');
        container.innerHTML = '<h3>Jogos Gerados Agora:</h3>';
        
        games.forEach((game, index) => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <h4>Jogo ${index + 1}</h4>
                <div class="game-numbers">
                    ${game.numbers.map(num => 
                        `<span class="game-number">${String(num).padStart(2, '0')}</span>`
                    ).join('')}
                </div>
                <div class="game-info">${game.date}</div>
            `;
            container.appendChild(card);
        });
    }

    saveManualGame() {
        if (this.selectedNumbers.length < 6) {
            alert('Selecione pelo menos 6 números!');
            return;
        }
        
        if (this.selectedNumbers.length > 15) {
            alert('Máximo de 15 números por jogo!');
            return;
        }
        
        const game = {
            id: Date.now(),
            numbers: [...this.selectedNumbers].sort((a, b) => a - b),
            type: 'manual',
            date: new Date().toLocaleString('pt-BR')
        };
        
        this.savedGames.push(game);
        this.saveToLocalStorage();
        this.displaySavedGames();
        this.clearSelection();
        
        alert('Jogo manual salvo com sucesso!');
    }

    saveToLocalStorage() {
        localStorage.setItem('megaSenaGames', JSON.stringify(this.savedGames));
    }

    displaySavedGames() {
        const container = document.getElementById('savedGames');
        
        if (this.savedGames.length === 0) {
            container.innerHTML = '<p>Nenhum jogo salvo ainda.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        this.savedGames.forEach((game, index) => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <h4>Jogo ${index + 1} (${game.type === 'manual' ? 'Manual' : 'Gerado'})</h4>
                <div class="game-numbers">
                    ${game.numbers.map(num => 
                        `<span class="game-number">${String(num).padStart(2, '0')}</span>`
                    ).join('')}
                </div>
                <div class="game-info">${game.date}</div>
            `;
            container.appendChild(card);
        });
    }

    checkGames() {
        if (this.savedGames.length === 0) {
            alert('Nenhum jogo salvo para conferir!');
            return;
        }
        
        const lastDraw = this.currentYearDraws[this.currentYearDraws.length - 1];
        const drawnNumbers = lastDraw.bolas.map(b => parseInt(b, 10));
        
        const resultsEl = document.getElementById('checkResults');
        resultsEl.innerHTML = `
            <div class="check-header">
                <h3>Concurso ${lastDraw.concurso}</h3>
                <h3>Data: ${lastDraw.data.toLocaleDateString('pt-BR')}</h3>
            <div class="game-numbers">
                    ${lastDraw.bolas.map(num => 
                    `<span class="game-number">${num}</span>`
                ).join('')}
                </div>
            </div>
            <h3>Conferência dos seus jogos:</h3>
        `;
        
        this.savedGames.forEach((game, index) => {
            const hits = game.numbers.filter(num => drawnNumbers.includes(num));
            
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <h4>Jogo ${index + 1} (${game.type === 'manual' ? 'Manual' : 'Gerado'}) - ${hits.length} acerto(s)</h4>
                <div class="game-numbers">
                            ${game.numbers.map(num => {
                        const isHit = drawnNumbers.includes(num);
                        return `<span class="game-number ${isHit ? 'hit' : ''}">${String(num).padStart(2, '0')}</span>`;
                            }).join('')}
                        </div>
                <div class="game-info">
                    ${hits.length >= 4 ? '🎉 Parabéns! ' : ''}
                    ${hits.length === 6 ? 'SENA!' : 
                      hits.length === 5 ? 'QUINA!' : 
                      hits.length === 4 ? 'QUADRA!' : 
                      'Não premiado'}
                    </div>
                `;
            resultsEl.appendChild(card);
        });
    }

    showAllSections() {
        document.getElementById('sectionAnalysis').classList.remove('hidden');
        document.getElementById('sectionGenerate').classList.remove('hidden');
        document.getElementById('sectionManual').classList.remove('hidden');
        document.getElementById('sectionSaved').classList.remove('hidden');
        document.getElementById('sectionCheck').classList.remove('hidden');
    }
}

// Inicializar aplicativo
document.addEventListener('DOMContentLoaded', () => {
    new MegaSenaApp();
});
