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

const API_URL =
'https://script.google.com/macros/s/AKfycbysQsC4As_tu6RuKWVOxpozlvVULs95H3R1uOG_e3VuTuf2wrMunGyKAb1GMwAu_m4/exec';

let agendamentos = [];
let selecionados = new Set();


// =====================================================
// DATA
// =====================================================

function hojeISO() {

  const d = new Date();

  return d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, '0') +
    "-" +
    String(d.getDate()).padStart(2, '0');

}


// =====================================================
// CARREGAR AGENDAMENTOS
// =====================================================

async function carregarAgendamentos() {

  try {

    // Evita que o navegador reutilize uma resposta antiga do GET
    const url = API_URL + '?t=' + Date.now();

    const resposta = await fetch(url, {
      cache: 'no-store'
    });

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

// =====================================================
// CRIAR HORÁRIOS
// =====================================================

function criarHorarios() {

  const select = document.getElementById('horario');

  select.innerHTML = '';

  HORARIOS.forEach((h, index) => {

    const opt = document.createElement('option');

    opt.value = index;

    opt.textContent =
      h.label +
      (h.intervalo ? ' — INTERVALO' : '') +
      (h.almoco ? ' — ALMOÇO' : '');

    opt.disabled = !!(h.intervalo || h.almoco);

    select.appendChild(opt);

  });

  atualizarPeriodo();

}


// =====================================================
// HORÁRIOS SELECIONADOS
// =====================================================

function horariosSelecionados() {

  const select = document.getElementById('horario');

  return [...select.selectedOptions]
    .map(option => HORARIOS[Number(option.value)])
    .filter(h => h && !h.intervalo && !h.almoco);

}


// =====================================================
// ATUALIZAR TEXTO DO PERÍODO
// =====================================================

function atualizarPeriodo() {

  const horarios = horariosSelecionados();

  const campo =
    document.getElementById('periodoInfo');

  if (!horarios.length) {

    campo.value = 'Selecione um ou mais horários';

    return;

  }

  campo.value =
    horarios.map(h => h.label).join(' | ');

}


// =====================================================
// SOBREPOSIÇÃO
// =====================================================

function sobrepoe(a, b) {

  return (
    a.inicio < b.fim &&
    b.inicio < a.fim
  );

}


// =====================================================
// CHROMES OCUPADOS
// =====================================================

function ocupados(data, horarios) {

  const usados = new Set();

  if (!data || !horarios.length) {
    return usados;
  }

  agendamentos
    .filter(a => a.data === data)
    .forEach(a => {

      const conflitoHorario =
        horarios.some(h =>
          sobrepoe(
            {
              inicio: h.inicio,
              fim: h.fim
            },
            {
              inicio: a.inicio,
              fim: a.fim
            }
          )
        );

      if (!conflitoHorario) {
        return;
      }

      a.chromes.forEach(c => {

        const numero = Number(c);

        if (
          Number.isInteger(numero) &&
          numero >= 1 &&
          numero <= TOTAL
        ) {
          usados.add(numero);
        }

      });

    });

  return usados;

}


// =====================================================
// ATUALIZAR DISPONIBILIDADE
// =====================================================

function atualizarDisponibilidade() {

  const data =
    document.getElementById('data').value;

  const horarios =
    horariosSelecionados();

  const usados =
    ocupados(data, horarios);

  for (let i = 1; i <= TOTAL; i++) {

    const el =
      document.getElementById('c' + i);

    if (!el) continue;

    const busy =
      usados.has(i) &&
      !selecionados.has(i);

    el.classList.toggle(
      'busy',
      busy
    );

    el.disabled = busy;

    el.classList.toggle(
      'selected',
      selecionados.has(i)
    );

  }

}


// =====================================================
// CRIAR CHROMES
// =====================================================

function criarChromes() {

  const box =
    document.getElementById('chromes');

  box.innerHTML = '';

  for (let i = 1; i <= TOTAL; i++) {

    const b =
      document.createElement('button');

    b.type = 'button';

    b.className = 'chrome';

    b.id = 'c' + i;

    b.textContent =
      'Chrome ' +
      String(i).padStart(2, '0');

    b.onclick = () =>
      toggleChrome(i);

    box.appendChild(b);

  }

  atualizarDisponibilidade();

}


// =====================================================
// SELECIONAR CHROME
// =====================================================

function toggleChrome(i) {

  const data =
    document.getElementById('data').value;

  const horarios =
    horariosSelecionados();

  if (!horarios.length) {

    return msg(
      'Selecione primeiro um ou mais horários.',
      false
    );

  }

  const usados =
    ocupados(data, horarios);

  if (usados.has(i)) {
    return;
  }

  if (selecionados.has(i)) {

    selecionados.delete(i);

  } else {

    selecionados.add(i);

  }

  atualizarDisponibilidade();

}


// =====================================================
// SELECIONAR TODOS DISPONÍVEIS
// =====================================================

function selecionarDisponiveis() {

  const data =
    document.getElementById('data').value;

  const horarios =
    horariosSelecionados();

  if (!horarios.length) {

    return msg(
      'Selecione primeiro um ou mais horários.',
      false
    );

  }

  const usados =
    ocupados(data, horarios);

  for (let i = 1; i <= TOTAL; i++) {

    if (!usados.has(i)) {
      selecionados.add(i);
    }

  }

  atualizarDisponibilidade();

}


// =====================================================
// LIMPAR SELEÇÃO
// =====================================================

function limparSelecao() {

  selecionados.clear();

  atualizarDisponibilidade();

}


// =====================================================
// MENSAGEM
// =====================================================

function msg(text, ok = true) {

  const s =
    document.getElementById('status');

  s.textContent = text;

  s.className =
    'status ' +
    (ok ? 'ok' : 'err');

}


// =====================================================
// AGENDAR
// =====================================================

async function agendar() {

  const professor =
    document.getElementById('professor')
      .value
      .trim();

  const data =
    document.getElementById('data')
      .value;

  const horarios =
    horariosSelecionados();

  if (
    !professor ||
    !data ||
    !horarios.length
  ) {

    return msg(
      'Preencha professor, data e selecione pelo menos um horário.',
      false
    );

  }


  if (!selecionados.size) {

    return msg(
      'Selecione pelo menos um Chromebook.',
      false
    );

  }


  // ---------------------------------------------------
  // Verificar conflito antes de enviar
  // ---------------------------------------------------

  const usados =
    ocupados(data, horarios);

  const conflito =
    [...selecionados]
      .filter(c => usados.has(c));


  if (conflito.length) {

    return msg(
      'Alguns Chromebooks ficaram indisponíveis. Atualize a seleção.',
      false
    );

  }


  const dados = {

    acao: 'agendar',

    professor,

    data,

    horarios: horarios.map(h => ({
      inicio: h.inicio,
      fim: h.fim
    })),

    chromes:
      [...selecionados]
        .sort((a, b) => a - b)

  };


  try {

    msg(
      'Salvando agendamento...'
    );


    const resposta =
      await fetch(API_URL, {

        method: 'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body:
          JSON.stringify(dados)

      });


    const resultado =
      await resposta.json();


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

    document.getElementById(
      'professor'
    ).value = '';


    document.getElementById(
      'horario'
    ).selectedIndex = -1;


    atualizarPeriodo();

    await carregarAgendamentos();


  } catch (erro) {

    console.error(erro);

    msg(
      'Erro ao salvar o agendamento.',
      false
    );

  }

}


// =====================================================
// APAGAR
// =====================================================

async function apagar(id) {

  if (
    !confirm(
      'Deseja cancelar este agendamento?'
    )
  ) {

    return;

  }


  try {

    const resposta =
      await fetch(API_URL, {

        method: 'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body:
          JSON.stringify({
            acao: 'apagar',
            id
          })

      });


    const resultado =
      await resposta.json();


    if (!resultado.sucesso) {

      return msg(
        resultado.mensagem,
        false
      );

    }


    msg(
      'Agendamento cancelado.'
    );


    await carregarAgendamentos();


  } catch (erro) {

    console.error(erro);

    msg(
      'Erro ao cancelar o agendamento.',
      false
    );

  }

}


// =====================================================
// FORMATAR CHROMES
// =====================================================

function formatarChromes(arr) {

  return arr
    .map(c =>
      'Chrome ' +
      String(c).padStart(2, '0')
    )
    .join(', ');

}


// =====================================================
// RENDERIZAR AGENDA
// =====================================================

function renderAgenda() {

  const data =
    document.getElementById(
      'filtroData'
    ).value;

  const tbody =
    document.getElementById(
      'agenda'
    );

  tbody.innerHTML = '';


  const itens =
    agendamentos
      .filter(a => a.data === data)
      .sort((a, b) =>
        a.inicio.localeCompare(b.inicio)
      );


  HORARIOS.forEach(h => {

    const tr =
      document.createElement('tr');


    const tdTime =
      document.createElement('td');

    tdTime.className = 'time';

    tdTime.textContent =
      h.label;


    const td =
      document.createElement('td');

    td.className = 'slot';


    if (
      h.intervalo ||
      h.almoco
    ) {

      td.style.background =
        '#eeeeee';

      td.innerHTML =
        `<div class="empty">
          <strong>
            ${h.almoco
              ? '🍽️ ALMOÇO'
              : '☕ INTERVALO'}
          </strong>
        </div>`;

      tr.append(
        tdTime,
        td
      );

      tbody.appendChild(tr);

      return;

    }


    const noSlot =
      itens.filter(a =>
        a.inicio === h.inicio &&
        a.fim === h.fim
      );


    if (!noSlot.length) {

      td.innerHTML =
        '<div class="empty">Disponível</div>';

    }


    noSlot.forEach(a => {

      const div =
        document.createElement('div');

      div.className =
        'booking';


      div.innerHTML = `
        <strong>
          ${escapeHtml(a.professor)}
        </strong>

        <small>
          ${a.inicio}–${a.fim}
          · ${a.chromes.length}
          Chromebook(s)
        </small>

        <small>
          ${escapeHtml(
            formatarChromes(a.chromes)
          )}
        </small>

        <button
          class="danger"
          style="margin-top:5px;padding:5px 8px;font-size:11px"
          onclick="apagar(${a.id})">
          Cancelar
        </button>
      `;


      td.appendChild(div);

    });


    tr.append(
      tdTime,
      td
    );

    tbody.appendChild(tr);

  });


  atualizarResumo(data);

}


// =====================================================
// RESUMO
// =====================================================

function atualizarResumo(data) {

  const usados =
    new Set();


  agendamentos
    .filter(a => a.data === data)
    .forEach(a => {

      a.chromes.forEach(c =>
        usados.add(c)
      );

    });


  document.getElementById(
    'resumo'
  ).textContent =

    `${usados.size} de ${TOTAL} Chromebooks possuem algum agendamento na data selecionada. ` +
    `${TOTAL - usados.size} não possuem agendamento no momento.`;

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escapeHtml(s) {

  return String(s).replace(
    /[&<>"']/g,

    m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m])

  );

}


// =====================================================
// HOJE
// =====================================================

function hoje() {

  document.getElementById(
    'filtroData'
  ).value = hojeISO();

  renderAgenda();

}


// =====================================================
// LIMPAR TODOS
// =====================================================

async function limparTodos() {

  if (
    !confirm(
      'Isso apagará TODOS os agendamentos. Continuar?'
    )
  ) {

    return;

  }


  try {

    const resposta =
      await fetch(API_URL, {

        method: 'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body:
          JSON.stringify({
            acao: 'limparTodos'
          })

      });


    const resultado =
      await resposta.json();


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


// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const dataAtual =
      hojeISO();


    document.getElementById(
      'data'
    ).value = dataAtual;


    document.getElementById(
      'filtroData'
    ).value = dataAtual;


    criarHorarios();

    criarChromes();


    document.getElementById(
      'data'
    ).addEventListener(
      'change',
      () => {

        selecionados.clear();

        atualizarDisponibilidade();

      }
    );


    document.getElementById(
      'horario'
    ).addEventListener(
      'change',
      () => {

        atualizarPeriodo();

        selecionados.clear();

        atualizarDisponibilidade();

      }
    );


    document.getElementById(
      'filtroData'
    ).addEventListener(
      'change',
      renderAgenda
    );


    carregarAgendamentos();


    setInterval(
      carregarAgendamentos,
      10000
    );

  }
);
