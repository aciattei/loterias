document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const updateDataBtn = document.getElementById('updateData');
    const generateGamesBtn = document.getElementById('generateGames');
    const dataLoading = document.getElementById('dataLoading');
    const lastContestElement = document.getElementById('lastContest');
    const contestDateElement = document.getElementById('contestDate');
    const daysSinceElement = document.getElementById('daysSince');
    const totalContestsElement = document.getElementById('totalContests');
    const delayedNumbersElement = document.getElementById('delayedNumbers');
    const topPairsElement = document.getElementById('topPairs');
    const bottomPairsElement = document.getElementById('bottomPairs');
    const suggestedGamesElement = document.getElementById('suggestedGames');
    const lotofacilWheelElement = document.getElementById('lotofacilWheel');
    
    // Dados da aplicação
    let lotofacilData = null;
    let delayedNumbers = [];
    let suggestedGames = [];
    
  
    // Event Listeners
    updateDataBtn.addEventListener('click', updateData);
    generateGamesBtn.addEventListener('click', generateSuggestedGames);
    
    // Tab functionality
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and content
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Funções
    
    async function init() {
        showLoading(true);
        try {
            // Simular chamada à API
            // Na implementação real, substituir por fetch('/api/data')
            await simulateApiCall();
            
            // Carregar dados (simulação)
            loadSampleData();
            
            // Atualizar UI
            updateUI();
            
            // Inicializar gráficos
            initCharts();
            
            // Criar volante
            createWheel();
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados. Por favor, tente novamente.');
        } finally {
            showLoading(false);
        }
    }
    
    function showLoading(show) {
        if (show) {
            dataLoading.style.display = 'flex';
            updateDataBtn.disabled = true;
            generateGamesBtn.disabled = true;
        } else {
            dataLoading.style.display = 'none';
            updateDataBtn.disabled = false;
            generateGamesBtn.disabled = false;
        }
    }
    
    async function updateData() {
        showLoading(true);
        try {
            // Simular atualização de dados
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Na implementação real, chamar a API para atualizar dados
            // const response = await fetch('/api/update', { method: 'POST' });
            // const data = await response.json();
            
            // Simular dados atualizados
            loadSampleData();
            updateUI();
            
            alert('Dados atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            alert('Erro ao atualizar dados. Por favor, tente novamente.');
        } finally {
            showLoading(false);
        }
    }
    
    function loadSampleData() {
        // Simular dados - na implementação real, esses dados viriam da API
        const now = new Date();
        const lastDate = new Date();
        lastDate.setDate(now.getDate() - 2);
        
        lotofacilData = {
            lastContest: 2750,
            contestDate: lastDate.toLocaleDateString('pt-BR'),
            daysSince: 2,
            totalContests: 2750,
            delayedNumbers: [
                { number: 25, delay: 15 },
                { number: 3, delay: 12 },
                { number: 18, delay: 11 },
                { number: 7, delay: 10 },
                { number: 12, delay: 9 },
                { number: 21, delay: 8 },
                { number: 5, delay: 7 },
                { number: 14, delay: 6 },
                { number: 9, delay: 5 },
                { number: 23, delay: 4 }
            ],
            topPairs: [
                { numbers: [4, 8], frequency: 120 },
                { numbers: [10, 15], frequency: 118 },
                { numbers: [2, 6], frequency: 117 },
                { numbers: [7, 11], frequency: 116 },
                { numbers: [13, 19], frequency: 115 }
            ],
            bottomPairs: [
                { numbers: [1, 25], frequency: 42 },
                { numbers: [3, 24], frequency: 43 },
                { numbers: [5, 22], frequency: 45 },
                { numbers: [8, 20], frequency: 46 },
                { numbers: [9, 21], frequency: 47 }
            ]
        };
        
        delayedNumbers = lotofacilData.delayedNumbers.map(item => item.number);
    }
    
    function updateUI() {
        if (!lotofacilData) return;
        
        // Atualizar informações básicas
        lastContestElement.textContent = lotofacilData.lastContest;
        contestDateElement.textContent = lotofacilData.contestDate;
        daysSinceElement.textContent = lotofacilData.daysSince;
        totalContestsElement.textContent = lotofacilData.totalContests;
        
        // Atualizar números atrasados
        delayedNumbersElement.innerHTML = '';
        for (let i = 1; i <= 25; i++) {
            const numberEl = document.createElement('div');
            numberEl.className = 'number';
            numberEl.textContent = i;
            
            if (delayedNumbers.includes(i)) {
                numberEl.classList.add('delayed');
            }
            
            delayedNumbersElement.appendChild(numberEl);
        }
        
        // Atualizar pares frequentes
        topPairsElement.innerHTML = '';
        lotofacilData.topPairs.forEach(pair => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${pair.numbers[0]} e ${pair.numbers[1]}</span> <strong>${pair.frequency}</strong>`;
            topPairsElement.appendChild(li);
        });
        
        // Atualizar pares infrequentes
        bottomPairsElement.innerHTML = '';
        lotofacilData.bottomPairs.forEach(pair => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${pair.numbers[0]} e ${pair.numbers[1]}</span> <strong>${pair.frequency}</strong>`;
            bottomPairsElement.appendChild(li);
        });
    }
    
    function generateSuggestedGames() {
        showLoading(true);
        
        // Simular geração de jogos (levaria 1-2 segundos na implementação real)
        setTimeout(() => {
            suggestedGames = [];
            
            // Gerar 4 jogos aleatórios com 15 números cada
            for (let i = 0; i < 4; i++) {
                const game = [];
                const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
                
                // Incluir alguns números atrasados (3-5 por jogo)
                const delayedInGame = delayedNumbers
                    .sort(() => 0.5 - Math.random())
                    .slice(0, Math.floor(Math.random() * 3) + 3);
                
                game.push(...delayedInGame);
                
                // Completar com outros números
                const remainingNumbers = allNumbers.filter(n => !delayedInGame.includes(n));
                const otherNumbers = remainingNumbers
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 15 - delayedInGame.length);
                
                game.push(...otherNumbers);
                
                suggestedGames.push(game.sort((a, b) => a - b));
            }
            
            renderSuggestedGames();
            createWheel();
            showLoading(false);
        }, 1000);
    }
    
    function renderSuggestedGames() {
        suggestedGamesElement.innerHTML = '';
        
        suggestedGames.forEach((game, index) => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            
            const title = document.createElement('h3');
            title.textContent = `Jogo ${index + 1}`;
            gameCard.appendChild(title);
            
            const numbersContainer = document.createElement('div');
            numbersContainer.className = 'game-numbers';
            
            game.forEach(num => {
                const numEl = document.createElement('div');
                numEl.className = 'game-number';
                numEl.textContent = num;
                numbersContainer.appendChild(numEl);
            });
            
            gameCard.appendChild(numbersContainer);
            suggestedGamesElement.appendChild(gameCard);
        });
    }
    
    function createWheel() {
        lotofacilWheelElement.innerHTML = '';
        
        for (let i = 1; i <= 25; i++) {
            const numberEl = document.createElement('div');
            numberEl.className = 'wheel-number';
            numberEl.textContent = i;
            
            if (delayedNumbers.includes(i)) {
                numberEl.classList.add('delayed');
            }
            
            // Verificar se o número está em algum jogo sugerido
            if (suggestedGames.some(game => game.includes(i))) {
                numberEl.classList.add('suggested');
            }
            
            lotofacilWheelElement.appendChild(numberEl);
        }
    }
    
    function simulateApiCall() {
        return new Promise(resolve => {
            setTimeout(resolve, 1000);
        });
    }
});