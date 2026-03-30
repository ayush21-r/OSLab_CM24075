/**
 * CPU Scheduling Visualizer Logic
 * Handles Process Input, Algorithm Simulation, Time Complexity, and Animation
 */

let processes = [];
let processCounter = 1;

// Color Palette for Gantt Chart blocks
const COLORS = [
    '#00f0ff', '#ff007f', '#8a2be2', '#10b981', '#f59e0b',
    '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'
];

// DOM Object Bindings
const elements = {
    pidInput: document.getElementById('pidInput'),
    atInput: document.getElementById('atInput'),
    btInput: document.getElementById('btInput'),
    addBtn: document.getElementById('addBtn'),
    inputTableBody: document.getElementById('inputTableBody'),
    outputTableBody: document.getElementById('outputTableBody'),
    queueCount: document.getElementById('queueCount'),
    algoSelect: document.getElementById('algoSelect'),
    sjfType: document.getElementById('sjfTypeGroup'),
    sjfTypeSelect: document.getElementById('sjfType'),
    tqGroup: document.getElementById('tqGroup'),
    tqInput: document.getElementById('timeQuantum'),
    runBtn: document.getElementById('runBtn'),
    resetBtn: document.getElementById('resetBtn'),
    clearBtn: document.getElementById('clearBtn'),
    ganttChart: document.getElementById('ganttChart'),
    ganttTimeline: document.getElementById('ganttTimeline'),
    avgWt: document.getElementById('avgWt'),
    avgTat: document.getElementById('avgTat'),
    toastContainer: document.getElementById('toastContainer')
};

// UI Listeners
elements.algoSelect.addEventListener('change', (e) => {
    if (e.target.value === 'SJF') {
        elements.sjfType.classList.remove('hidden');
        elements.tqGroup.classList.add('hidden');
    } else {
        elements.sjfType.classList.add('hidden');
        elements.tqGroup.classList.remove('hidden');
    }
});

// Primary Button Bindings
elements.addBtn.addEventListener('click', addProcess);
elements.clearBtn.addEventListener('click', () => {
    processes = [];
    processCounter = 1;
    renderInputTable();
    resetOutput();
    showToast('All processes cleared', 'warning');
});
elements.resetBtn.addEventListener('click', () => {
    resetOutput();
    showToast('Output reset successfully', 'success');
});
elements.runBtn.addEventListener('click', startSimulation);

// Core Add Execution
function addProcess() {
    let pid = elements.pidInput.value.trim();
    let at = parseInt(elements.atInput.value.trim(), 10);
    let bt = parseInt(elements.btInput.value.trim(), 10);

    if (!pid) pid = 'P' + processCounter;
    if (isNaN(at)) at = 0;

    if (isNaN(bt) || bt <= 0) {
        showToast('Burst time must be at least 1', 'error');
        return;
    }
    if (at < 0) {
        showToast('Arrival time must be positive', 'error');
        return;
    }
    if (processes.find(p => p.id.toLowerCase() === pid.toLowerCase())) {
        showToast(`Process ${pid} already exists!`, 'error');
        return;
    }

    processes.push({ id: pid, at: at, bt: bt });
    processCounter++;

    // Reset individual inputs
    elements.pidInput.value = '';
    elements.atInput.value = '';
    elements.btInput.value = '';
    elements.pidInput.focus();

    renderInputTable();
    showToast(`Process ${pid} added`, 'success');
}

// Inline Table Removal
window.deleteProcess = function (id) {
    processes = processes.filter(p => p.id !== id);
    renderInputTable();
    showToast(`Process ${id} removed`, 'warning');
};

function renderInputTable() {
    elements.inputTableBody.innerHTML = '';
    elements.queueCount.textContent = processes.length;

    if (processes.length === 0) {
        elements.inputTableBody.innerHTML = `<tr class="empty-state"><td colspan="4">No processes added yet.</td></tr>`;
        return;
    }

    processes.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.id}</strong></td>
            <td>${p.at}</td>
            <td>${p.bt}</td>
            <td>
                <button class="btn-icon" onclick="deleteProcess('${p.id}')" title="Delete">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        `;
        elements.inputTableBody.appendChild(tr);
    });
}

function resetOutput() {
    elements.ganttChart.innerHTML = '<div class="gantt-empty">Run simulation to visualize execution</div>';
    elements.ganttTimeline.innerHTML = '';
    elements.outputTableBody.innerHTML = `<tr class="empty-state"><td colspan="6">Awaiting simulation results...</td></tr>`;
    elements.avgWt.innerHTML = '0.00 <span class="unit">ms</span>';
    elements.avgTat.innerHTML = '0.00 <span class="unit">ms</span>';
}

async function startSimulation() {
    if (processes.length === 0) {
        showToast('Please add at least one process!', 'error');
        return;
    }

    const algo = elements.algoSelect.value;
    const sjfType = elements.sjfTypeSelect.value;
    const tq = parseInt(elements.tqInput.value, 10);

    const originalText = elements.runBtn.innerHTML;
    elements.runBtn.disabled = true;
    elements.runBtn.innerHTML = '<span class="spinner"></span> Running...';

    resetOutput();
    await new Promise(res => setTimeout(res, 500)); // Simulate loading calculation

    let result;
    if (algo === 'SJF') {
        if (sjfType === 'non-preemptive') result = runSJFNonPreemptive();
        else result = runSRTF(); // Shortest Remaining Time First
    } else if (algo === 'RR') {
        if (isNaN(tq) || tq <= 0) {
            showToast('Invalid Time Quantum', 'error');
            elements.runBtn.disabled = false;
            elements.runBtn.innerHTML = originalText;
            return;
        }
        result = runRoundRobin(tq);
    }

    renderOutputTable(result.data);
    await animateGanttChart(result.sequence);

    elements.runBtn.disabled = false;
    elements.runBtn.innerHTML = originalText;
}

// Sequence merging helper logic
function mergeSequence(seq) {
    let merged = [];
    for (let block of seq) {
        if (merged.length > 0 && merged[merged.length - 1].id === block.id) {
            merged[merged.length - 1].end = block.end;
        } else if (block.start !== block.end) {
            merged.push({ ...block });
        }
    }
    return merged;
}

// 1. SJF: Non-Preemptive
function runSJFNonPreemptive() {
    let data = processes.map(p => ({ ...p, completed: false }));
    let n = data.length;
    let time = 0;
    let completed = 0;
    let sequence = [];

    while (completed < n) {
        let available = data.filter(p => p.at <= time && !p.completed);

        if (available.length === 0) {
            let uncompleted = data.filter(p => !p.completed).sort((a, b) => a.at - b.at);
            let nextStart = uncompleted[0].at;
            sequence.push({ id: 'Idle', start: time, end: nextStart });
            time = nextStart;
            continue;
        }

        available.sort((a, b) => a.bt === b.bt ? a.at - b.at : a.bt - b.bt);
        let p = available[0];

        sequence.push({ id: p.id, start: time, end: time + p.bt });
        time += p.bt;

        let pRef = data.find(x => x.id === p.id);
        pRef.ct = time;
        pRef.tat = pRef.ct - pRef.at;
        pRef.wt = pRef.tat - pRef.bt;
        pRef.completed = true;

        completed++;
    }

    return { sequence: mergeSequence(sequence), data };
}

// 2. SJF: Preemptive (SRTF)
function runSRTF() {
    let data = processes.map(p => ({ ...p, rt: p.bt }));
    let n = data.length;
    let time = 0;
    let completed = 0;
    let sequence = [];

    while (completed < n) {
        let available = data.filter(p => p.at <= time && p.rt > 0);

        if (available.length === 0) {
            sequence.push({ id: 'Idle', start: time, end: time + 1 });
            time++;
            continue;
        }

        available.sort((a, b) => a.rt === b.rt ? a.at - b.at : a.rt - b.rt);
        let p = available[0];

        sequence.push({ id: p.id, start: time, end: time + 1 });
        p.rt--;
        time++;

        if (p.rt === 0) {
            let pRef = data.find(x => x.id === p.id);
            pRef.ct = time;
            pRef.tat = pRef.ct - pRef.at;
            pRef.wt = pRef.tat - pRef.bt;
            completed++;
        }
    }

    return { sequence: mergeSequence(sequence), data };
}

// 3. Round Robin
function runRoundRobin(tq) {
    let data = processes.map(p => ({ ...p, rt: p.bt }));
    data.sort((a, b) => a.at - b.at);
    let n = data.length;
    let time = 0;
    let completed = 0;
    let queue = [];
    let sequence = [];
    let i = 0;

    while (i < n && data[i].at <= time) {
        queue.push(data[i]);
        i++;
    }

    while (completed < n) {
        if (queue.length === 0) {
            if (i < n) {
                sequence.push({ id: 'Idle', start: time, end: data[i].at });
                time = data[i].at;
                while (i < n && data[i].at <= time) {
                    queue.push(data[i]);
                    i++;
                }
            }
        } else {
            let curr = queue.shift();
            let runTime = Math.min(curr.rt, tq);

            sequence.push({ id: curr.id, start: time, end: time + runTime });
            time += runTime;
            curr.rt -= runTime;

            while (i < n && data[i].at <= time) {
                queue.push(data[i]);
                i++;
            }

            if (curr.rt > 0) {
                queue.push(curr);
            } else {
                let pRef = data.find(x => x.id === curr.id);
                pRef.ct = time;
                pRef.tat = pRef.ct - pRef.at;
                pRef.wt = pRef.tat - pRef.bt;
                completed++;
            }
        }
    }

    return { sequence: mergeSequence(sequence), data };
}

function renderOutputTable(data) {
    elements.outputTableBody.innerHTML = '';
    let sortedData = [...data].sort((a, b) => a.ct - b.ct);

    let totalTat = 0, totalWt = 0;

    sortedData.forEach(p => {
        totalTat += p.tat;
        totalWt += p.wt;
        let color = getColorForProcess(p.id);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
               <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${color}; margin-right:8px; box-shadow:0 0 8px ${color};"></span>
               <strong>${p.id}</strong>
            </td>
            <td>${p.at}</td>
            <td>${p.bt}</td>
            <td style="color: var(--neon-blue); font-weight:600;">${p.ct}</td>
            <td style="color: var(--neon-purple); font-weight:600;">${p.tat}</td>
            <td style="color: var(--warning); font-weight:600;">${p.wt}</td>
        `;
        elements.outputTableBody.appendChild(tr);
    });

    elements.avgWt.innerHTML = `${(totalWt / data.length).toFixed(2)} <span class="unit">ms</span>`;
    elements.avgTat.innerHTML = `${(totalTat / data.length).toFixed(2)} <span class="unit">ms</span>`;
}

function getColorForProcess(pid) {
    if (!pid || pid === 'Idle') return 'transparent';
    let numeric = parseInt(pid.replace(/\D/g, ''), 10);
    if (isNaN(numeric)) numeric = pid.charCodeAt(0) + (pid.charCodeAt(pid.length - 1) || 0);
    return COLORS[numeric % COLORS.length];
}

async function animateGanttChart(sequence) {
    const container = elements.ganttChart;
    const timeline = elements.ganttTimeline;
    container.innerHTML = '';
    timeline.innerHTML = '';

    if (sequence.length === 0) return;

    let totalTime = sequence[sequence.length - 1].end;
    timeline.innerHTML = `<div class="timeline-marker" style="left: 0%">0</div>`;
    let currentPercent = 0;

    for (let i = 0; i < sequence.length; i++) {
        let block = sequence[i];
        let pct = ((block.end - block.start) / totalTime) * 100;
        currentPercent += pct;

        let blockEl = document.createElement('div');
        blockEl.className = 'gantt-block';
        blockEl.style.width = '0%';

        if (block.id === 'Idle') {
            blockEl.style.background = 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 10px, transparent 10px, transparent 20px)';
            blockEl.innerHTML = `<span style="opacity:0.5; font-size: 0.8rem;">Idle</span>`;
        } else {
            let color = getColorForProcess(block.id);
            blockEl.style.background = `linear-gradient(135deg, ${color}cc, ${color}88)`;
            blockEl.style.boxShadow = `inset 0 0 10px rgba(255,255,255,0.2)`;
            blockEl.innerHTML = `<span>${block.id}</span>`;
        }

        container.appendChild(blockEl);

        await new Promise(r => setTimeout(r, 20));
        blockEl.style.width = `${pct}%`;
        await new Promise(r => setTimeout(r, 400));

        timeline.innerHTML += `<div class="timeline-marker" style="left: ${currentPercent}%">${block.end}</div>`;
    }
    showToast('Simulation complete!', 'success');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

// ====== Modal Bindings ======
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    const algoLink = navLinks[1]; // Algorithms
    const aboutLink = navLinks[2]; // About
    
    const algoModal = document.getElementById('algoModal');
    const aboutModal = document.getElementById('aboutModal');
    const closeBtns = document.querySelectorAll('.close-modal');

    if(algoLink && algoModal) {
        algoLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            algoModal.classList.remove('hidden'); 
        });
    }

    if(aboutLink && aboutModal) {
        aboutLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            aboutModal.classList.remove('hidden'); 
        });
    }

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(algoModal) algoModal.classList.add('hidden');
            if(aboutModal) aboutModal.classList.add('hidden');
        });
    });

    window.addEventListener('click', (e) => {
        if(e.target === algoModal) algoModal.classList.add('hidden');
        if(e.target === aboutModal) aboutModal.classList.add('hidden');
    });
});
