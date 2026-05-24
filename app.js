const SHEET_ID = '1LbkbR5g33QREAyuDRmpze6_O3SaYLw84sQ7mBYLvfoM';
let dataItems = [];
let searchHistory = [];
let currentCategory = 'Tudo';

const CATEGORY_MAP = {
    'Tudo': [],
    'Transportes': ['CarScript'],
    'Armas': ['Rifle_Base', 'Pistol_Base', 'RifleBoltFree_Base', 'SubmachineGun_Base'],
    'AttArmas': ['ItemOptics', 'ItemSuppressor', 'ItemMuzzle', 'Magazine_Base', 'Ammunition_Base'],
    'Roupas': ['Clothing', 'Vest_Base', 'Backpack_Base', 'HelmetBase'],
    'Comida': ['Edible_Base', 'MedicalItemBase', 'ToolBase'],
    'Armazenamento': ['DeployableContainer_Base', 'Kit_Base', 'CombinationLock']
};

const COL_MAP = {
    class: 'ClassName',
    display: 'DisplayName',
    slot: 'InventorySlot',
    attach: 'PossibleAttachments',
    desc: 'Description',
    parent: 'Parent'
};


lucide.createIcons();

function loadData() {
    const script = document.createElement('script');
    // Adicionamos o parâmetro tq para garantir que o Google envie tudo (até 10.000 linhas)
    const query = encodeURIComponent('select * limit 10000');
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:handleResponse&tq=${query}`;
    document.body.appendChild(script);
}


window.handleResponse = function(response) {
    const statusLabel = document.getElementById('data-status');
    const grid = document.getElementById('resultsGrid');

    try {
        const rows = response.table.rows;
        const cols = response.table.cols;
        
        // 1. Tentar pegar headers das colunas do Google
        let headers = cols.map(c => c.label || '');
        
        // 2. Se as labels estiverem vazias (como no seu caso), pegamos da primeira linha de dados
        const firstRowCells = rows[0].c;
        const hasNoLabels = headers.every(h => !h || h.startsWith('col'));
        
        if (hasNoLabels) {
            headers = firstRowCells.map(cell => cell ? String(cell.v).trim() : '');
            // Removemos a primeira linha (cabeçalho) dos dados reais
            rows.shift();
        }
        
        dataItems = rows.map((row, rowIndex) => {
            const item = {};
            row.c.forEach((cell, colIndex) => {
                const colTitle = headers[colIndex] || `col${colIndex}`;
                item[colTitle] = cell ? cell.v : '';
            });
            // Ajuste do número da linha na planilha original
            item.originalRow = hasNoLabels ? rowIndex + 2 : rowIndex + 1;
            return item;
        });

        statusLabel.textContent = `${dataItems.length} Itens sincronizados`;
        statusLabel.style.background = 'rgba(34, 197, 94, 0.1)';
        statusLabel.style.color = '#4ade80';
        
        renderCategories();
        renderResults(dataItems);
    } catch (error) {
        console.error('Erro ao processar dados:', error);
        statusLabel.textContent = 'Erro de Sincronia';
        grid.innerHTML = '<div class="loader">Erro ao conectar com a base de dados.</div>';
    }
};



function getVal(item, ...possibleNames) {
    const keys = Object.keys(item);
    // Tenta busca exata (sem espaços/case)
    let key = keys.find(k => {
        const cleanK = k.toLowerCase().replace(/[^a-z]/g, '');
        return possibleNames.some(p => p.toLowerCase().replace(/[^a-z]/g, '') === cleanK);
    });
    
    // Se não achou, e é ClassName, tenta a primeira coluna disponível que não seja 'originalRow'
    if (!key && possibleNames.includes('ClassName')) {
        key = keys.find(k => k !== 'originalRow');
    }

    return item[key] || '';
}

function renderResults(items) {
    const grid = document.getElementById('resultsGrid');
    
    // Vamos ser menos rigorosos no filtro para garantir que apareça algo
    const validItems = items.filter(item => {
        const name = getVal(item, 'ClassName', 'Class Name');
        return name && String(name).length > 1; // Apenas garante que tem algum texto
    });

    if (validItems.length === 0 && items.length > 0) {
        // Se falhou no filtro, mas tem itens, mostra os itens crus para não ficar vazio
        renderRaw(items);
        return;
    }

    if (items.length === 0) {
        grid.innerHTML = '<div class="loader">Nenhum item encontrado.</div>';
        return;
    }

    grid.innerHTML = (validItems.length > 0 ? validItems : items).map((item) => {
        const name = getVal(item, 'ClassName', 'Class Name');
        const display = getVal(item, 'DisplayName', 'Display Name') || name;

        return `
            <div class="item-card" onclick="showDetails(${dataItems.indexOf(item)})">
                <span class="classname">${name}</span>
                <div class="item-title">${display}</div>
            </div>
        `;
    }).join('');
}

// Função de emergência caso nada seja detectado
function renderRaw(items) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = items.map(item => {
        const values = Object.values(item);
        return `
            <div class="item-card" onclick="showDetails(${dataItems.indexOf(item)})">
                <span class="classname">${values[0]}</span>
                <div class="item-title">${values[2] || values[1] || '---'}</div>
            </div>
        `;
    }).join('');
}

function showDetails(index) {
    const item = dataItems[index];
    const modal = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');

    const name = getVal(item, 'ClassName', 'Class Name');
    const display = getVal(item, 'DisplayName', 'Display Name') || name;

    let html = `
        <div class="modal-header">
            <span class="classname" onclick="copyToClipboard('${name}')">${name}</span>
            <h2 class="item-title" style="font-size: 1.8rem; margin-top: 1rem; word-break: break-all;">${display}</h2>
        </div>
        <div class="modal-body">
    `;

    // Renderizar todos os campos
    Object.keys(item).forEach(key => {
        if (key === 'originalRow' || !item[key]) return;
        
        const val = item[key];
        const lowKey = key.toLowerCase();
        
        // Se o nome da coluna for gigante, encurtamos apenas o título da label para o layout
        const displayLabel = key.length > 30 ? "Informação Adicional" : key;

        html += `<div class="info-section">`;
        
        if (lowKey.includes('slot') || lowKey.includes('inventory')) {
            html += `
                <span class="section-label">${displayLabel}</span>
                <div class="tag-container">
                    ${String(val).split(',').map(s => `<span class="tag" onclick="compatibilitySearch('${s.trim()}', 'attach')">${s.trim()}</span>`).join('')}
                </div>
            `;
        } else if (lowKey.includes('attachment')) {
            html += `
                <span class="section-label">${displayLabel}</span>
                <div class="tag-container">
                    ${String(val).split(',').map(s => `<span class="tag attachment-tag" onclick="compatibilitySearch('${s.trim()}', 'slot')">${s.trim()}</span>`).join('')}
                </div>
            `;
        } else {
            html += `
                <span class="section-label">${displayLabel}</span>
                <div class="section-value" style="word-break: break-word;" onclick="copyToClipboard('${val}')">${val}</div>
            `;
        }
        
        html += `</div>`;
    });

    html += `</div>`;
    body.innerHTML = html;
    modal.style.display = 'flex';
}



function compatibilitySearch(term, targetType) {
    // Salvar estado atual para o botão voltar
    searchHistory.push({
        class: document.getElementById('classSearch').value,
        display: document.getElementById('displaySearch').value,
        general: document.getElementById('searchInput').value
    });
    
    document.getElementById('backBtn').style.display = 'flex';
    document.getElementById('modalOverlay').style.display = 'none';
    
    copyToClipboard(term);

    const filtered = dataItems.filter(item => {
        const colKey = targetType === 'slot' ? 
            (COL_MAP.slot || 'InventorySlot') : 
            (COL_MAP.attach || 'PossibleAttachments');
        
        // Verifica em qual coluna o termo deve estar
        // Se targetType é 'attach', clicamos num Slot, buscamos quem tem esse SLOT em PossibleAttachments?
        // O usuário disse: "se o nome estiver em inventoryslot ele deve pesquisar por itens quem tem o mesmo nome em passibleAttachments"
        
        let searchCol = '';
        if (targetType === 'attach') { // Clicou no SLOT do item atual
            // Quer ver quem tem esse termo como ATTACHMENT? 
            // Não, quer ver quem PODE RECEBER esse item.
            // Ex: Item atual tem Slot "Vest". Clicou em "Vest". Pesquisar itens que tem "Vest" no PossibleAttachments.
            searchCol = 'PossibleAttachments';
        } else { // Clicou no ATTACH do item atual
            // Quer ver quem tem esse termo no InventorySlot.
            searchCol = 'InventorySlot';
        }

        // Busca robusta em nomes de colunas
        const realCol = Object.keys(item).find(k => k.toLowerCase().includes(searchCol.toLowerCase()));
        const val = item[realCol];
        return val && String(val).toLowerCase().includes(term.toLowerCase());
    });

    renderResults(filtered);
    document.getElementById('searchInput').value = `Busca: ${term}`;
}

function goBack() {
    const lastState = searchHistory.pop();
    if (lastState) {
        document.getElementById('classSearch').value = lastState.class;
        document.getElementById('displaySearch').value = lastState.display;
        document.getElementById('searchInput').value = lastState.general;
        applyFilters();
    }
    if (searchHistory.length === 0) {
        document.getElementById('backBtn').style.display = 'none';
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('copyToast');
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 2000);
    });
}

// Eventos de Filtro Simultâneo
function renderCategories() {
    const bar = document.getElementById('filtersBar');
    if (!bar) return;
    
    bar.innerHTML = Object.keys(CATEGORY_MAP).map(cat => `
        <button class="filter-chip ${currentCategory === cat ? 'active' : ''}" 
                onclick="setCategory('${cat}')">
            ${cat}
        </button>
    `).join('');
}

function setCategory(cat) {
    currentCategory = cat;
    renderCategories();
    applyFilters();
}

function applyFilters() {
    const classQuery = document.getElementById('classSearch').value.toLowerCase();
    const displayQuery = document.getElementById('displaySearch').value.toLowerCase();
    const generalQuery = document.getElementById('searchInput').value.toLowerCase();

    const filtered = dataItems.filter(item => {
        const itemClass = String(getVal(item, 'ClassName', 'Class Name')).toLowerCase();
        const itemDisplay = String(getVal(item, 'DisplayName', 'Display Name')).toLowerCase();
        const itemParent = String(getVal(item, 'Parent')).toLowerCase();
        
        // 1. Filtro por ClassName
        const matchClass = itemClass.includes(classQuery);
        
        // 2. Filtro por DisplayName
        const matchDisplay = itemDisplay.includes(displayQuery);
        
        // 3. Filtro por Categoria (Parent)
        let matchCategory = true;
        if (currentCategory !== 'Tudo') {
            const allowedParents = CATEGORY_MAP[currentCategory].map(p => p.toLowerCase());
            matchCategory = allowedParents.includes(itemParent);
        }

        // 4. Filtro Geral (em todas as colunas)
        const matchGeneral = Object.values(item).some(val => 
            String(val).toLowerCase().includes(generalQuery)
        );

        return matchClass && matchDisplay && matchCategory && matchGeneral;
    });

    renderResults(filtered);
}


document.getElementById('classSearch').addEventListener('input', applyFilters);
document.getElementById('displaySearch').addEventListener('input', applyFilters);
document.getElementById('searchInput').addEventListener('input', applyFilters);

document.getElementById('closeModal').onclick = () => {
    document.getElementById('modalOverlay').style.display = 'none';
};

window.onclick = (event) => {
    const modal = document.getElementById('modalOverlay');
    if (event.target == modal) modal.style.display = 'none';
};

document.getElementById('backBtn').onclick = goBack;

// Registro do Service Worker (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('PWA carregado com sucesso!'))
            .catch(err => console.log('Erro ao carregar PWA', err));
    });
}

loadData();


