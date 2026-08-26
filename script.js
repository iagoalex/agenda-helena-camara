const TOTAL = 80;
    const HORARIOS = [
      {inicio: '07:45', fim: '08:35', label: '07:45 - 08:35'},
      {inicio: '08:35', fim: '09:25', label: '08:35 - 09:25'},
      {inicio: '09:25', fim: '09:40', label: '09:25 - 09:40', intervalo: true},
      {inicio: '09:40', fim: '10:30', label: '09:40 - 10:30'},
      {inicio: '10:30', fim: '11:20', label: '10:30 - 11:20'},
      {inicio: '11:20', fim: '12:10', label: '11:20 - 12:10'},
      {inicio: '12:10', fim: '13:10', label: '12:10 - 13:10', almoco: true},
      {inicio: '13:10', fim: '14:00', label: '13:10 - 14:00'},
      {inicio: '14:00', fim: '14:50', label: '14:00 - 14:50'},
      {inicio: '14:50', fim: '15:05', label: '14:50 - 15:05', intervalo: true},
      {inicio: '15:05', fim: '15:55', label: '15:05 - 15:55'},
      {inicio: '15:55', fim: '16:45', label: '15:55 - 16:45'}
    ];

    const API_URL = 'https://script.google.com/macros/s/AKfycbySifLwp0k5yHJR7FkQ5-vjK1SZS6b7-C2riY366onRs1eFHb-wswPypxIsRUeJF92-/exec';

    let agendamentos = [];
    let selecionados = new Set();

    async function carregarAgendamentos() {

      try {
    
        const resposta = await fetch(API_URL);
        agendamentos = await resposta.json();
    
        atualizarDisponibilidade();
        renderAgenda();
    
      } catch (erro) {
    
        console.error(erro);
    
        msg(
          'Não foi possível carregar os agendamentos.',
          false
        );
      }
    }

    function hojeISO() {
      const d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    }
    document.getElementById('data').value = hojeISO();
    document.getElementById('filtroData').value = hojeISO();

    function criarHorarios() {
      const select = document.getElementById('horario');
      select.innerHTML = '<option value="">Selecione um horário</option>';
      HORARIOS.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.inicio + '|' + h.fim;
        opt.textContent = h.label + (h.intervalo ? ' — INTERVALO' : '') + (h.almoco ? ' — ALMOÇO' : '');
        opt.disabled = !!(h.intervalo || h.almoco);
        select.appendChild(opt);
      });
      atualizarPeriodo();
    }
    function horarioSelecionado() {
      const v = document.getElementById('horario').value;
      if (!v) return null;
      const [inicio, fim] = v.split('|');
      return {inicio, fim};
    }
    function atualizarPeriodo() {
      const h = horarioSelecionado();
      document.getElementById('periodoInfo').value = h ? `${h.inicio} às ${h.fim}` : 'Selecione um horário';
    }

    function criarChromes() {
      const box = document.getElementById('chromes');
      box.innerHTML = '';
      for (let i = 1; i <= TOTAL; i++) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chrome'; b.id = 'c' + i;
        b.textContent = 'Chrome ' + String(i).padStart(2, '0');
        b.onclick = () => toggleChrome(i);
        box.appendChild(b);
      }
      atualizarDisponibilidade();
    }
    function sobrepoe(a, b) {
      return a.inicio < b.fim && b.inicio < a.fim;
    }
    function ocupados(data, inicio, fim) {
      const usados = new Set();
      agendamentos.filter(a => a.data === data && sobrepoe({inicio, fim}, a))
        .forEach(a => a.chromes.forEach(c => usados.add(c)));
      return usados;
    }
    function atualizarDisponibilidade() {
      const data = document.getElementById('data').value;
      const h = horarioSelecionado();
      const inicio = h?.inicio || '';
      const fim = h?.fim || '';
      const usados = ocupados(data, inicio, fim);
      for (let i = 1; i <= TOTAL; i++) {
        const el = document.getElementById('c' + i);
        const busy = usados.has(i) && !selecionados.has(i);
        el.classList.toggle('busy', busy);
        el.disabled = busy;
        el.classList.toggle('selected', selecionados.has(i));
      }
    }
    function toggleChrome(i) {
      const data = document.getElementById('data').value;
      const h = horarioSelecionado();
      if (!h) return msg('Selecione primeiro um horário.', false);
      const inicio = h?.inicio || '';
      const fim = h?.fim || '';
      if (ocupados(data, inicio, fim).has(i)) return;
      selecionados.has(i) ? selecionados.delete(i) : selecionados.add(i);
      atualizarDisponibilidade();
    }
    function selecionarDisponiveis() {
      const data = document.getElementById('data').value;
      const h = horarioSelecionado();
      const inicio = h?.inicio || '';
      const fim = h?.fim || '';
      const usados = ocupados(data, inicio, fim);
      for (let i = 1; i <= TOTAL; i++) if (!usados.has(i)) selecionados.add(i);
      atualizarDisponibilidade();
    }
    function limparSelecao() {selecionados.clear(); atualizarDisponibilidade();}
    function msg(text, ok = true) {
      const s = document.getElementById('status');
      s.textContent = text; s.className = 'status ' + (ok ? 'ok' : 'err');
    }
    async function agendar() {

  const professor =
    document.getElementById('professor').value.trim();

  const data =
    document.getElementById('data').value;

  const h = horarioSelecionado();

  const inicio = h?.inicio || '';
  const fim = h?.fim || '';

  if (!professor || !data || !inicio || !fim) {
    return msg(
      'Preencha professor, data e horários.',
      false
    );
  }

  if (inicio >= fim) {
    return msg(
      'O horário final deve ser maior que o horário inicial.',
      false
    );
  }

  if (!selecionados.size) {
    return msg(
      'Selecione pelo menos um Chromebook.',
      false
    );
  }

  const usados = ocupados(data, inicio, fim);

  const conflito =
    [...selecionados].filter(c => usados.has(c));

  if (conflito.length) {

    return msg(
      'Alguns Chromebooks ficaram indisponíveis. Atualize a seleção.',
      false
    );
  }

  const dados = {

    acao: 'agendar',

    professor: professor,

    data: data,

    inicio: inicio,

    fim: fim,

    chromes: [...selecionados]
      .sort((a, b) => a - b)
  };

  try {

    msg('Salvando agendamento...');

    const resposta = await fetch(API_URL, {

      method: 'POST',

      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },

      body: JSON.stringify(dados)

    });

    const resultado = await resposta.json();

    if (!resultado.sucesso) {

      return msg(
        resultado.mensagem,
        false
      );
    }

    msg(
      'Agendamento realizado com sucesso!'
    );

    selecionados.clear();

    document.getElementById('professor').value = '';

    await carregarAgendamentos();

  } catch (erro) {

    console.error(erro);

    msg(
      'Erro ao salvar o agendamento.',
      false
    );
  }
}
      salvar();
      msg('Agendamento realizado com sucesso!');
      selecionados.clear();
      document.getElementById('professor').value = '';
      atualizarDisponibilidade();
      renderAgenda();
    }
    async function apagar(id) {

      if (!confirm('Deseja cancelar este agendamento?')) {
        return;
      }
    
      try {
    
        const resposta = await fetch(API_URL, {
    
          method: 'POST',
    
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
    
          body: JSON.stringify({
            acao: 'apagar',
            id: id
          })
    
        });
    
        const resultado = await resposta.json();
    
        if (!resultado.sucesso) {
    
          return msg(
            resultado.mensagem,
            false
          );
        }
    
        msg('Agendamento cancelado.');
    
        await carregarAgendamentos();
    
      } catch (erro) {
    
        console.error(erro);
    
        msg(
          'Erro ao cancelar o agendamento.',
          false
        );
      }
    }
    function formatarChromes(arr) {
      return arr.map(c => 'Chrome ' + String(c).padStart(2, '0')).join(', ');
    }
    function renderAgenda() {
      const data = document.getElementById('filtroData').value;
      const tbody = document.getElementById('agenda');
      tbody.innerHTML = '';
      const itens = agendamentos.filter(a => a.data === data).sort((a, b) => a.inicio.localeCompare(b.inicio));
      HORARIOS.forEach(h => {
        const tr = document.createElement('tr');
        const tdTime = document.createElement('td'); tdTime.className = 'time';
        tdTime.textContent = h.label;
        const td = document.createElement('td'); td.className = 'slot';
        if (h.intervalo || h.almoco) {
          td.style.background = '#eeeeee';
          td.innerHTML = `<div class="empty"><strong>${h.almoco ? '🍽️ ALMOÇO' : '☕ INTERVALO'}</strong></div>`;
          tr.append(tdTime, td); tbody.appendChild(tr); return;
        }
        const noSlot = itens.filter(a => a.inicio === h.inicio && a.fim === h.fim);
        if (!noSlot.length) td.innerHTML = '<div class="empty">Disponível</div>';
        noSlot.forEach(a => {
          const div = document.createElement('div'); div.className = 'booking';
          div.innerHTML = `<strong>${escapeHtml(a.professor)}</strong>
      <small>${a.inicio}–${a.fim} · ${a.chromes.length} Chromebook(s)</small>
      <small>${escapeHtml(formatarChromes(a.chromes))}</small>
      <button class="danger" style="margin-top:5px;padding:5px 8px;font-size:11px" onclick="apagar(${a.id})">Cancelar</button>`;
          td.appendChild(div);
        });
        tr.append(tdTime, td); tbody.appendChild(tr);
      });
      atualizarResumo(data);
    }
    function atualizarResumo(data) {
      const usados = new Set();
      agendamentos.filter(a => a.data === data).forEach(a => a.chromes.forEach(c => usados.add(c)));
      document.getElementById('resumo').textContent =
        `${usados.size} de ${TOTAL} Chromebooks possuem algum agendamento na data selecionada. ${TOTAL - usados.size} não possuem agendamento no momento.`;
    }
    function escapeHtml(s) {return s.replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[m]));}
    function hoje() {document.getElementById('filtroData').value = hojeISO(); renderAgenda();}
    async function limparTodos() {

      if (!confirm(
        'Isso apagará TODOS os agendamentos. Continuar?'
      )) {
        return;
      }
    
      try {
    
        const resposta = await fetch(API_URL, {
    
          method: 'POST',
    
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
    
          body: JSON.stringify({
            acao: 'limparTodos'
          })
    
        });
    
        const resultado = await resposta.json();
    
        if (!resultado.sucesso) {
    
          return msg(
            resultado.mensagem,
            false
          );
        }
    
        msg(
          'Todos os agendamentos foram apagados.'
        );
    
        await carregarAgendamentos();
    
      } catch (erro) {
    
        console.error(erro);
    
        msg(
          'Erro ao apagar os agendamentos.',
          false
        );
      }
    }
    ['data', 'horario'].forEach(id => document.getElementById(id).addEventListener('change', () => {
      if (id === 'horario') atualizarPeriodo();
      selecionados.clear(); atualizarDisponibilidade();
    }));

    criarHorarios();
    criarChromes();
    carregarAgendamentos();

    setInterval(() => {
      carregarAgendamentos();
    }, 10000);
