function initCharts() {
    // Gráfico de atrasos
    const delaysCtx = document.getElementById('delaysChart').getContext('2d');
    
    // Dados de exemplo - na implementação real viriam da API
    const delayedNumbersData = [
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
    ];
    
    new Chart(delaysCtx, {
        type: 'bar',
        data: {
            labels: delayedNumbersData.map(item => item.number.toString()),
            datasets: [{
                label: 'Concursos sem sair',
                data: delayedNumbersData.map(item => item.delay),
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Concursos sem sair'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Número'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Números mais atrasados na Lotofácil',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Gráfico de tendências (simulado)
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');
    
    new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: Array.from({ length: 10 }, (_, i) => `Concurso ${2740 + i}`),
            datasets: [
                {
                    label: 'Número 25',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Número 3',
                    data: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Número 18',
                    data: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value === 1 ? 'Saiu' : 'Não saiu';
                        }
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Tendência de alguns números atrasados',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Chamar initCharts quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initCharts);