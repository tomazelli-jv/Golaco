/* =============================================================
   GOLAÇO!score — football-v1
   Futebol, Futsal e Society
   ============================================================= */
'use strict';

const API_BASE = ['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '5500'
  ? 'https://xn--golao-1ra.tomaz.host'
  : '';

const Auth = {
  token: localStorage.getItem('golacoScoreAuthToken') || '',
  showLogin(message = '') {
    document.getElementById('authenticated-app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    const error = document.getElementById('login-error');
    error.textContent = message;
    error.classList.toggle('hidden', !message);
    setTimeout(() => document.getElementById('login-username')?.focus(), 0);
  },
  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('authenticated-app').classList.remove('hidden');
  },
  async restore() {
    if (!this.token) return false;
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (!response.ok) throw new Error();
      return true;
    } catch {
      this.logout(false);
      return false;
    }
  },
  async login(username, password) {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) throw new Error(data.error || 'Não foi possível entrar.');
    this.token = data.token;
    localStorage.setItem('golacoScoreAuthToken', data.token);
  },
  logout(showMessage = true) {
    this.token = '';
    localStorage.removeItem('golacoScoreAuthToken');
    Modal.close();
    this.showLogin(showMessage ? 'Sessão encerrada.' : '');
  }
};

async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (Auth.token) headers.set('Authorization', `Bearer ${Auth.token}`);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) Auth.logout(false);
  return response;
}

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.getElementById('btn-install-app')?.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.getElementById('btn-install-app')?.classList.add('hidden');
  Toast.show('GOLAÇO!score instalado!');
});

const Utils = {
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  nowISO() { return new Date().toISOString(); },
  todayISO() {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  },
  isSameDay(iso, dateISO) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return false;
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10) === dateISO;
  },
  datetimeLocalValue(iso = new Date().toISOString()) {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  },
  yearOf(iso) { return new Date(iso).getFullYear(); },
  formatDateShort(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  },
  formatDateFull(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  },
  formatDateTime(iso) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  },
  initials(name) {
    const parts = String(name || '?').trim().split(/\s+/);
    return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },
  escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  },
  validPhoto(photo) {
    return typeof photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(photo);
  },
  avatarHtml(player, extraClass = '') {
    const classes = `avatar ${extraClass}`.trim();
    if (player && Utils.validPhoto(player.photo))
      return `<div class="${classes} has-photo"><img src="${player.photo}" alt="" loading="lazy"></div>`;
    return `<div class="${classes}">${Utils.initials(player?.name || '?')}</div>`;
  },
  round1(n) { return Math.round(Number(n || 0) * 10) / 10; },
  formatSize(format) { return Number(String(format).split('x')[0]) || 5; },
  modalityLabel(value) {
    return ({ futebol: 'Futebol', futsal: 'Futsal', society: 'Society' })[value] || 'Society';
  },
  positionLabel(value) {
    return ({ goleiro: 'Goleiro', defensor: 'Defensor', meio: 'Meio-campo', atacante: 'Atacante', versatil: 'Versátil' })[value] || 'Versátil';
  },
  defaultFormat(modality) {
    return ({ futebol: '11x11', futsal: '5x5', society: '7x7' })[modality] || '7x7';
  },
  formatsFor(modality) {
    if (modality === 'futebol') return ['7x7', '8x8', '9x9', '10x10', '11x11'];
    if (modality === 'futsal') return ['4x4', '5x5', '6x6'];
    return ['5x5', '6x6', '7x7', '8x8', '9x9'];
  },
  resizePhoto(file, maxSize = 512) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Selecione uma imagem válida.'));
      if (file.size > 10 * 1024 * 1024) return reject(new Error('A foto deve ter no máximo 10 MB.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Imagem inválida.'));
        image.onload = () => {
          const side = Math.min(image.naturalWidth, image.naturalHeight);
          const canvas = document.createElement('canvas');
          canvas.width = maxSize; canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          const sx = (image.naturalWidth - side) / 2;
          const sy = (image.naturalHeight - side) / 2;
          ctx.drawImage(image, sx, sy, side, side, 0, 0, maxSize, maxSize);
          resolve(canvas.toDataURL('image/jpeg', .82));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
};

const Toast = {
  show(msg) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }
};

const DB = (() => {
  const defaultState = () => {
    const year = new Date().getFullYear();
    return {
      seasons: [year],
      currentSeason: year,
      leagueName: 'GOLAÇO!score'
    };
  };

  let state = defaultState();

  async function load() {
    try {
      const response = await apiFetch(`${API_BASE}/api/db`);
      if (!response.ok) throw new Error('Erro ao buscar configurações.');
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
        state = defaultState();
        await save();
      } else {
        state = data;
        delete state.players;
        delete state.matches;
        if (!Array.isArray(state.seasons) || !state.seasons.length) state.seasons = [new Date().getFullYear()];
        if (!state.currentSeason) state.currentSeason = state.seasons[state.seasons.length - 1];
        if (!state.leagueName || /^BRICK!?SCORE FOOTBALL$/i.test(state.leagueName)) {
          state.leagueName = 'GOLAÇO!score';
          await save();
        }
      }
    } catch (err) {
      console.error(err);
      state = defaultState();
    }
  }

  async function save() {
    const response = await apiFetch(`${API_BASE}/api/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!response.ok) throw new Error('Não foi possível salvar as configurações.');
    return true;
  }

  return {
    get data() { return state; },
    load,
    save,
    async reset() { state = defaultState(); await save(); }
  };
})();

const Players = {
  list: [],
  async load() {
    const response = await apiFetch(`${API_BASE}/api/players`);
    if (!response.ok) throw new Error('Erro ao carregar jogadores.');
    this.list = await response.json();
  },
  all() { return this.list.filter((player) => player.active !== false); },
  byId(id) { return this.list.find((p) => p.id === id); },
  search(term) {
    const t = String(term || '').trim().toLowerCase();
    const active = this.all();
    return t ? active.filter((p) => p.name.toLowerCase().includes(t)) : active;
  },
  async add(name, photo = null, position = 'versatil', goalkeeper = false) {
    const player = { id: Utils.uid(), name: name.trim(), photo, position, goalkeeper, createdAt: Utils.nowISO() };
    const response = await apiFetch(`${API_BASE}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player)
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Erro ao cadastrar jogador.');
    await this.load();
    return player;
  },
  async update(id, name, photo = null, position = 'versatil', goalkeeper = false) {
    const response = await apiFetch(`${API_BASE}/api/players/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, photo, position, goalkeeper })
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Erro ao alterar jogador.');
    await this.load();
  },
  async remove(id) {
    const response = await apiFetch(`${API_BASE}/api/players/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Erro ao excluir jogador.');
    await this.load();
  }
};

const Matches = {
  list: [],
  async load() {
    const response = await apiFetch(`${API_BASE}/api/matches`);
    if (!response.ok) throw new Error('Erro ao carregar partidas.');
    const data = await response.json();
    this.list = Array.isArray(data) ? data : [];
  },
  all() { return this.list.slice().sort((a, b) => new Date(b.date) - new Date(a.date)); },
  byId(id) { return this.list.find((m) => m.id === id); },
  bySeason(year) { return this.all().filter((m) => Number(m.season) === Number(year)); },
  async add(match) {
    const payload = { ...match, id: Utils.uid() };
    const response = await apiFetch(`${API_BASE}/api/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Erro ao salvar partida.');
    await this.load();
    return payload;
  },
  async update(id, match) {
    const response = await apiFetch(`${API_BASE}/api/matches/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(match)
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Erro ao alterar partida.');
    await this.load();
  },
  async remove(id) {
    const response = await apiFetch(`${API_BASE}/api/matches/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Erro ao excluir partida.');
    await this.load();
  }
};

const Stats = {
  normalizeStat(stat) {
    return {
      goals: Number(stat?.goals) || 0,
      assists: Number(stat?.assists) || 0,
      yellowCards: Number(stat?.yellowCards) || 0,
      redCards: Number(stat?.redCards) || 0
    };
  },

  forPlayer(playerId, matchesPool) {
    const pool = (matchesPool || Matches.all())
      .filter((m) => m.teamAIds?.includes(playerId) || m.teamBIds?.includes(playerId))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const out = {
      games: 0, wins: 0, losses: 0, draws: 0,
      goals: 0, assists: 0, yellowCards: 0, redCards: 0,
      contributions: 0, mvps: 0, avgGoals: 0, winRate: 0,
      maxGoals: 0, maxAssists: 0, history: []
    };

    pool.forEach((m) => {
      const raw = m.stats?.[playerId];
      if (!raw) return;
      const s = Stats.normalizeStat(raw);
      const onA = m.teamAIds.includes(playerId);
      const won = (onA && m.winner === 'A') || (!onA && m.winner === 'B');
      const draw = m.winner === 'draw';

      out.games += 1;
      out.goals += s.goals;
      out.assists += s.assists;
      out.yellowCards += s.yellowCards;
      out.redCards += s.redCards;
      out.contributions += s.goals + s.assists;
      out.maxGoals = Math.max(out.maxGoals, s.goals);
      out.maxAssists = Math.max(out.maxAssists, s.assists);
      if (m.mvpId === playerId || (Array.isArray(m.mvpTie) && m.mvpTie.includes(playerId))) out.mvps += 1;

      if (draw) out.draws += 1;
      else if (won) out.wins += 1;
      else out.losses += 1;

      out.history.push({
        matchId: m.id, date: m.date, won, draw,
        goals: s.goals, assists: s.assists,
        yellowCards: s.yellowCards, redCards: s.redCards
      });
    });

    out.avgGoals = out.games ? Utils.round1(out.goals / out.games) : 0;
    out.winRate = out.games ? Utils.round1((out.wins / out.games) * 100) : 0;
    return out;
  },

  rows(matchesPool) {
    const pool = matchesPool || Matches.all();
    return Players.all().map((player) => ({ player, stats: Stats.forPlayer(player.id, pool) }))
      .filter((r) => r.stats.games > 0);
  },

  ranking(type, matchesPool) {
    const rows = Stats.rows(matchesPool);
    const value = (s) => ({
      gols: s.goals,
      assistencias: s.assists,
      participacoes: s.contributions,
      vitorias: s.wins,
      mvp: s.mvps,
      media: s.avgGoals,
      disciplina: Math.max(0, 100 - s.yellowCards * 5 - s.redCards * 20)
    })[type] ?? s.goals;
    return rows.map((r) => ({ ...r, value: value(r.stats) }))
      .sort((a, b) => b.value - a.value || b.stats.goals - a.stats.goals);
  },

  ratingFor(playerId) {
    const s = Stats.forPlayer(playerId);
    if (!s.games) return 0;
    return s.avgGoals * 4 + (s.assists / s.games) * 2.5 + (s.wins / s.games) * 3;
  },

  period(period) {
    const all = Matches.all();
    if (period === 'temporada') return all.filter((m) => Number(m.season) === Number(DB.data.currentSeason));
    if (period === 'hoje') return all.filter((m) => Utils.isSameDay(m.date, Utils.todayISO()));
    return all;
  }
};

const Modal = {
  open(html) {
    document.getElementById('modal-container').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-container').innerHTML = '';
  },
  confirm(title, message, onConfirm, label = 'Confirmar') {
    Modal.open(`
      <div class="modal-header"><h2>${Utils.escapeHtml(title)}</h2><button class="modal-close" id="cf-close">✕</button></div>
      <div class="modal-body"><p class="football-muted">${Utils.escapeHtml(message)}</p></div>
      <div class="modal-footer">
        <button class="btn-secondary" id="cf-cancel">Cancelar</button>
        <button class="btn-danger" id="cf-confirm" style="flex:1;">${Utils.escapeHtml(label)}</button>
      </div>`);
    document.getElementById('cf-close').onclick = Modal.close;
    document.getElementById('cf-cancel').onclick = Modal.close;
    document.getElementById('cf-confirm').onclick = async () => {
      try { await onConfirm(); } finally { Modal.close(); }
    };
  }
};

const PlayerForm = {
  open(playerId) {
    const editing = playerId ? Players.byId(playerId) : null;
    let photo = editing?.photo || null;
    Modal.open(`
      <div class="modal-header"><h2>${editing ? 'Editar jogador' : 'Novo jogador'}</h2><button class="modal-close" id="pf-close">✕</button></div>
      <div class="modal-body">
        <div class="player-photo-picker">
          <div id="pf-photo-preview">${Utils.avatarHtml({ name: editing?.name || 'Novo jogador', photo }, 'xl')}</div>
          <div class="player-photo-actions">
            <label class="btn-secondary" for="pf-photo">Escolher foto</label>
            <button type="button" class="btn-ghost ${photo ? '' : 'hidden'}" id="pf-photo-remove">Remover</button>
          </div>
          <input type="file" id="pf-photo" accept="image/jpeg,image/png,image/webp" hidden>
        </div>
        <div class="field"><label>Nome</label><input id="pf-name" maxlength="40" value="${Utils.escapeHtml(editing?.name || '')}" placeholder="Nome do jogador"></div>
        <div class="field"><label>Posição principal</label><select id="pf-position">
          ${['versatil', 'goleiro', 'defensor', 'meio', 'atacante'].map((position) =>
            `<option value="${position}" ${(editing?.position || 'versatil') === position ? 'selected' : ''}>${Utils.positionLabel(position)}</option>`).join('')}
        </select></div>
        <label class="check-field"><input type="checkbox" id="pf-goalkeeper" ${editing?.goalkeeper || editing?.position === 'goleiro' ? 'checked' : ''}><span>Pode jogar como goleiro</span></label>
      </div>
      <div class="modal-footer">
        ${editing ? '<button class="btn-danger" id="pf-delete">Excluir</button>' : '<button class="btn-secondary" id="pf-cancel">Cancelar</button>'}
        <button class="btn-primary" id="pf-save" style="flex:1;">Salvar</button>
      </div>`);

    const nameInput = document.getElementById('pf-name');
    const preview = document.getElementById('pf-photo-preview');
    const remove = document.getElementById('pf-photo-remove');
    const paint = () => {
      preview.innerHTML = Utils.avatarHtml({ name: nameInput.value || 'Novo jogador', photo }, 'xl');
      remove.classList.toggle('hidden', !photo);
    };

    document.getElementById('pf-close').onclick = Modal.close;
    document.getElementById('pf-cancel')?.addEventListener('click', Modal.close);
    document.getElementById('pf-photo').onchange = async (e) => {
      if (!e.target.files[0]) return;
      try { photo = await Utils.resizePhoto(e.target.files[0]); paint(); }
      catch (err) { Toast.show(err.message); }
      e.target.value = '';
    };
    remove.onclick = () => { photo = null; paint(); };
    nameInput.oninput = () => { if (!photo) paint(); };

    document.getElementById('pf-save').onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) return Toast.show('Digite o nome do jogador.');
      const position = document.getElementById('pf-position').value;
      const goalkeeper = document.getElementById('pf-goalkeeper').checked || position === 'goleiro';
      try {
        if (editing) await Players.update(editing.id, name, photo, position, goalkeeper);
        else await Players.add(name, photo, position, goalkeeper);
        Modal.close(); Router.render(); Toast.show('Jogador salvo.');
      } catch (err) { Toast.show(err.message); }
    };

    if (editing) {
      document.getElementById('pf-delete').onclick = () => Modal.confirm(
        'Arquivar jogador',
        `Arquivar ${editing.name}? O jogador sairá das novas escalações, mas continuará nas partidas antigas.`,
        async () => { await Players.remove(editing.id); Router.go('players'); Toast.show('Jogador arquivado.'); },
        'Arquivar'
      );
    }
  }
};

const MatchWizard = {
  state: null,

  open(editingId = null) {
    const editing = editingId ? Matches.byId(editingId) : null;
    if (editing) {
      this.state = {
        editingId,
        step: 0,
        modality: editing.modality || 'society',
        format: editing.format,
        dateLocal: Utils.datetimeLocalValue(editing.date),
        season: Number(editing.season),
        location: editing.location || '',
        teamAName: editing.teamA,
        teamBName: editing.teamB,
        selected: new Set([...(editing.teamAIds || []), ...(editing.teamBIds || [])]),
        teamAIds: [...(editing.teamAIds || [])],
        teamBIds: [...(editing.teamBIds || [])],
        statsMap: JSON.parse(JSON.stringify(editing.stats || {})),
        scoreA: Number(editing.scoreA) || 0,
        scoreB: Number(editing.scoreB) || 0,
        scoreAManual: true,
        scoreBManual: true,
        search: ''
      };
    } else {
      this.state = {
        editingId: null,
        step: 0,
        modality: 'society',
        format: '7x7',
        dateLocal: Utils.datetimeLocalValue(),
        season: Number(DB.data.currentSeason),
        location: '',
        teamAName: 'Time A',
        teamBName: 'Time B',
        selected: new Set(),
        teamAIds: [],
        teamBIds: [],
        statsMap: {},
        scoreA: 0, scoreB: 0,
        scoreAManual: false, scoreBManual: false,
        search: ''
      };
    }
    this.render();
  },

  size() { return Utils.formatSize(this.state.format); },

  captureDetails() {
    const s = this.state;
    s.dateLocal = document.getElementById('mw-date')?.value || s.dateLocal;
    s.season = Number(document.getElementById('mw-season')?.value || s.season);
    s.location = document.getElementById('mw-location')?.value.trim() || '';
    s.teamAName = document.getElementById('mw-teamA')?.value.trim() || 'Time A';
    s.teamBName = document.getElementById('mw-teamB')?.value.trim() || 'Time B';
  },

  render() {
    Modal.open(`
      <div class="modal-header">
        <div><div class="mh-eyebrow">${this.state.editingId ? 'Editar partida' : 'Nova partida'}</div><h2 id="mw-title"></h2></div>
        <button class="modal-close" id="mw-close">✕</button>
      </div>
      <div class="modal-body" id="mw-body"></div>
      <div class="modal-footer" id="mw-footer"></div>`);
    document.getElementById('mw-close').onclick = () => Modal.confirm(
      'Cancelar registro', 'Deseja descartar as alterações desta partida?', Modal.close, 'Descartar'
    );
    this.renderStep();
  },

  renderStep() {
    const s = this.state;
    const body = document.getElementById('mw-body');
    const footer = document.getElementById('mw-footer');
    document.getElementById('mw-title').textContent =
      ['Modalidade e times', 'Selecionar jogadores', 'Montar times', 'Estatísticas'][s.step];

    if (s.step === 0) {
      const formats = Utils.formatsFor(s.modality);
      body.innerHTML = `
        <div class="field"><label>Modalidade</label>
          <div class="football-modality-grid">
            ${['futebol', 'futsal', 'society'].map((m) =>
              `<button type="button" class="football-choice ${s.modality === m ? 'active' : ''}" data-modality="${m}">
                <span class="football-choice-code">${m === 'futebol' ? '11' : m === 'futsal' ? '5' : '7'}</span>${Utils.modalityLabel(m)}
              </button>`).join('')}
          </div>
        </div>
        <div class="field"><label>Formato</label>
          <div class="format-grid">
            ${formats.map((f) => `<div class="format-opt ${s.format === f ? 'active' : ''}" data-format="${f}">${f}</div>`).join('')}
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Data e horário</label><input id="mw-date" type="datetime-local" value="${Utils.escapeHtml(s.dateLocal)}"></div>
          <div class="field"><label>Temporada</label><select id="mw-season">
            ${DB.data.seasons.map((season) => `<option value="${Number(season)}" ${Number(season) === Number(s.season) ? 'selected' : ''}>${Number(season)}</option>`).join('')}
          </select></div>
        </div>
        <div class="field"><label>Local</label><input id="mw-location" maxlength="160" value="${Utils.escapeHtml(s.location)}" placeholder="Ex: Quadra municipal"></div>
        <div class="field-row">
          <div class="field"><label>Time A</label><input id="mw-teamA" maxlength="20" value="${Utils.escapeHtml(s.teamAName)}"></div>
          <div class="field"><label>Time B</label><input id="mw-teamB" maxlength="20" value="${Utils.escapeHtml(s.teamBName)}"></div>
        </div>`;

      body.querySelectorAll('[data-modality]').forEach((button) => {
        button.onclick = () => {
          this.captureDetails();
          s.modality = button.dataset.modality;
          s.format = Utils.defaultFormat(s.modality);
          s.selected.clear(); s.teamAIds = []; s.teamBIds = [];
          this.renderStep();
        };
      });
      body.querySelectorAll('[data-format]').forEach((button) => {
        button.onclick = () => {
          this.captureDetails();
          s.format = button.dataset.format;
          s.selected.clear(); s.teamAIds = []; s.teamBIds = [];
          this.renderStep();
        };
      });

      footer.innerHTML = '<button class="btn-primary" id="mw-next" style="flex:1;">Continuar</button>';
      document.getElementById('mw-next').onclick = () => {
        this.captureDetails();
        if (!s.dateLocal || Number.isNaN(new Date(s.dateLocal).getTime())) return Toast.show('Informe uma data e horário válidos.');
        s.step = 1; this.renderStep();
      };
      return;
    }

    if (s.step === 1) {
      const needed = this.size() * 2;
      const list = Players.search(s.search);
      body.innerHTML = `
        <div class="section-title"><h2>Jogadores presentes</h2><span class="link">${s.selected.size}/${needed}</span></div>
        <div class="field"><input id="mw-search" placeholder="Buscar jogador..." value="${Utils.escapeHtml(s.search)}"></div>
        <div class="field-row" style="align-items:flex-end;">
          <div class="field" style="flex:1;"><label>Novo jogador</label><input id="mw-new-player" maxlength="40" placeholder="Nome"></div>
          <button class="btn-secondary" id="mw-add-player">+ Cadastrar</button>
        </div>
        <div class="player-pick-list">
          ${list.length ? list.map((p) => `
            <div class="player-pick-row ${s.selected.has(p.id) ? 'selected' : ''}" data-player="${p.id}">
              ${Utils.avatarHtml(p, 'sm orange')}
              <div class="row-main"><div class="row-title">${Utils.escapeHtml(p.name)}</div><div class="row-sub">${Utils.positionLabel(p.position)}${p.goalkeeper && p.position !== 'goleiro' ? ' · também goleiro' : ''}</div></div>
              <div class="pick-toggle">${s.selected.has(p.id) ? 'OK' : '+'}</div>
            </div>`).join('') : '<div class="empty-state">Nenhum jogador cadastrado.</div>'}
        </div>`;

      document.getElementById('mw-search').oninput = (e) => {
        s.search = e.target.value; this.renderStep();
        const input = document.getElementById('mw-search'); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
      };
      document.getElementById('mw-add-player').onclick = async () => {
        const input = document.getElementById('mw-new-player');
        const name = input.value.trim();
        if (!name) return Toast.show('Digite o nome.');
        if (s.selected.size >= needed) return Toast.show(`A partida já tem ${needed} jogadores.`);
        try {
          const player = await Players.add(name);
          s.selected.add(player.id);
          this.renderStep();
          Toast.show('Jogador cadastrado.');
        } catch (err) { Toast.show(err.message); }
      };
      body.querySelectorAll('[data-player]').forEach((row) => {
        row.onclick = () => {
          const id = row.dataset.player;
          if (s.selected.has(id)) s.selected.delete(id);
          else if (s.selected.size < needed) s.selected.add(id);
          else return Toast.show(`Selecione exatamente ${needed} jogadores.`);
          this.renderStep();
        };
      });

      footer.innerHTML = `
        <button class="btn-secondary" id="mw-back">Voltar</button>
        <button class="btn-primary" id="mw-next" style="flex:1;" ${s.selected.size === needed ? '' : 'disabled'}>Continuar</button>`;
      document.getElementById('mw-back').onclick = () => { s.step = 0; this.renderStep(); };
      document.getElementById('mw-next').onclick = () => {
        if (s.selected.size !== needed) return;
        this.autoDraft(); s.step = 2; this.renderStep();
      };
      return;
    }

    if (s.step === 2) {
      const size = this.size();
      body.innerHTML = `
        <p class="football-muted">O sorteio tenta equilibrar os times pelo histórico. Você pode mover jogadores manualmente.</p>
        <button class="btn-chip" id="mw-shuffle">Sortear novamente</button>
        <div class="team-split">
          <div class="team-col"><h4>${Utils.escapeHtml(s.teamAName)} (${s.teamAIds.length}/${size})</h4>${this.teamHtml(s.teamAIds, 'A')}</div>
          <div class="team-col"><h4>${Utils.escapeHtml(s.teamBName)} (${s.teamBIds.length}/${size})</h4>${this.teamHtml(s.teamBIds, 'B')}</div>
        </div>`;
      document.getElementById('mw-shuffle').onclick = () => { this.autoDraft(); this.renderStep(); };
      body.querySelectorAll('[data-move]').forEach((button) => {
        button.onclick = () => {
          const id = button.dataset.move;
          const side = button.dataset.side;
          if (side === 'A' && s.teamBIds.length < size) {
            s.teamAIds = s.teamAIds.filter((x) => x !== id); s.teamBIds.push(id);
          } else if (side === 'B' && s.teamAIds.length < size) {
            s.teamBIds = s.teamBIds.filter((x) => x !== id); s.teamAIds.push(id);
          }
          this.renderStep();
        };
      });
      const balanced = s.teamAIds.length === size && s.teamBIds.length === size;
      footer.innerHTML = `
        <button class="btn-secondary" id="mw-back">Voltar</button>
        <button class="btn-primary" id="mw-next" style="flex:1;" ${balanced ? '' : 'disabled'}>Continuar</button>`;
      document.getElementById('mw-back').onclick = () => { s.step = 1; this.renderStep(); };
      document.getElementById('mw-next').onclick = () => {
        if (!balanced) return;
        [...s.teamAIds, ...s.teamBIds].forEach((id) => {
          if (!s.statsMap[id]) s.statsMap[id] = { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
        });
        s.step = 3; this.renderStep();
      };
      return;
    }

    this.renderStats(body, footer);
  },

  teamHtml(ids, side) {
    return ids.map((id) => {
      const p = Players.byId(id);
      return p ? `<div class="tp"><span>${Utils.escapeHtml(p.name)} <small>${p.goalkeeper ? 'GOL' : Utils.positionLabel(p.position)}</small></span><button data-move="${id}" data-side="${side}">⇄</button></div>` : '';
    }).join('');
  },

  autoDraft() {
    const s = this.state;
    const size = this.size();
    const ranked = Array.from(s.selected).map((id) => ({
      id, rating: Stats.ratingFor(id) + Math.random() * .01, goalkeeper: Boolean(Players.byId(id)?.goalkeeper)
    }));
    const goalkeepers = ranked.filter((player) => player.goalkeeper).sort((a, b) => b.rating - a.rating);
    const fieldPlayers = ranked.filter((player) => !player.goalkeeper).sort((a, b) => b.rating - a.rating);
    const A = [], B = [];
    let ratingA = 0, ratingB = 0;
    const add = (player, team) => {
      if (team === 'A') { A.push(player.id); ratingA += player.rating; }
      else { B.push(player.id); ratingB += player.rating; }
    };
    if (goalkeepers[0]) add(goalkeepers.shift(), 'A');
    if (goalkeepers[0]) add(goalkeepers.shift(), 'B');
    [...goalkeepers, ...fieldPlayers].forEach((player) => {
      if (A.length >= size) add(player, 'B');
      else if (B.length >= size) add(player, 'A');
      else if (ratingA < ratingB) add(player, 'A');
      else if (ratingB < ratingA) add(player, 'B');
      else add(player, A.length <= B.length ? 'A' : 'B');
    });
    s.teamAIds = A;
    s.teamBIds = B;
  },

  renderStats(body, footer) {
    const s = this.state;
    const rowHtml = (ids) => ids.map((id) => {
      const p = Players.byId(id);
      const st = Stats.normalizeStat(s.statsMap[id]);
      return `
        <div class="football-stat-row" data-pid="${id}">
          <span class="football-player-name">${Utils.escapeHtml(p?.name || '?')}</span>
          <label><input type="number" min="0" class="fs-goals" value="${st.goals}"><span>GOL</span></label>
          <label><input type="number" min="0" class="fs-assists" value="${st.assists}"><span>AST</span></label>
          <label><input type="number" min="0" class="fs-yellow" value="${st.yellowCards}"><span>CA</span></label>
          <label><input type="number" min="0" class="fs-red" value="${st.redCards}"><span>CV</span></label>
        </div>`;
    }).join('');

    body.innerHTML = `
      <div class="score-preview">
        <div class="side"><div class="tname">${Utils.escapeHtml(s.teamAName)}</div><input class="final-score-input" id="mw-scoreA" type="number" min="0" value="${s.scoreA}"></div>
        <div class="vs">VS</div>
        <div class="side"><div class="tname">${Utils.escapeHtml(s.teamBName)}</div><input class="final-score-input" id="mw-scoreB" type="number" min="0" value="${s.scoreB}"></div>
      </div>
      <div class="score-sum-note" id="mw-score-note"></div>
      <div class="section-sub">${Utils.escapeHtml(s.teamAName)}</div>${rowHtml(s.teamAIds)}
      <div class="section-sub">${Utils.escapeHtml(s.teamBName)}</div>${rowHtml(s.teamBIds)}`;

    const scoreA = document.getElementById('mw-scoreA');
    const scoreB = document.getElementById('mw-scoreB');
    const note = document.getElementById('mw-score-note');

    const recalc = () => {
      body.querySelectorAll('.football-stat-row').forEach((row) => {
        s.statsMap[row.dataset.pid] = {
          goals: Number(row.querySelector('.fs-goals').value) || 0,
          assists: Number(row.querySelector('.fs-assists').value) || 0,
          yellowCards: Number(row.querySelector('.fs-yellow').value) || 0,
          redCards: Number(row.querySelector('.fs-red').value) || 0
        };
      });
      const goalsA = s.teamAIds.reduce((sum, id) => sum + (s.statsMap[id]?.goals || 0), 0);
      const goalsB = s.teamBIds.reduce((sum, id) => sum + (s.statsMap[id]?.goals || 0), 0);
      if (!s.scoreAManual) scoreA.value = goalsA;
      if (!s.scoreBManual) scoreB.value = goalsB;
      s.scoreA = Math.max(0, Number(scoreA.value) || 0);
      s.scoreB = Math.max(0, Number(scoreB.value) || 0);
      const differs = s.scoreA !== goalsA || s.scoreB !== goalsB;
      note.classList.toggle('warning', differs);
      note.textContent = differs ? `Placar manual. Gols registrados: ${goalsA} x ${goalsB}.`
        : 'O placar corresponde à soma dos gols dos jogadores.';
    };

    body.querySelectorAll('.football-stat-row input').forEach((input) => input.oninput = recalc);
    scoreA.oninput = () => { s.scoreAManual = true; recalc(); };
    scoreB.oninput = () => { s.scoreBManual = true; recalc(); };
    recalc();

    footer.innerHTML = `
      <button class="btn-secondary" id="mw-back">Voltar</button>
      <button class="btn-primary" id="mw-save" style="flex:1;">Salvar partida</button>`;
    document.getElementById('mw-back').onclick = () => { recalc(); s.step = 2; this.renderStep(); };
    document.getElementById('mw-save').onclick = async () => {
      recalc();
      const button = document.getElementById('mw-save');
      button.disabled = true; button.textContent = 'Salvando...';
      try { await this.save(); }
      catch (err) { console.error(err); Toast.show(err.message || 'Erro ao salvar.'); button.disabled = false; button.textContent = 'Salvar partida'; }
    };
  },

  computeMvp(winner) {
    const s = this.state;
    const all = [...s.teamAIds, ...s.teamBIds];
    let bestScore = -Infinity, best = [];
    all.forEach((id) => {
      const st = Stats.normalizeStat(s.statsMap[id]);
      const onA = s.teamAIds.includes(id);
      const won = (onA && winner === 'A') || (!onA && winner === 'B');
      const score = st.goals * 3 + st.assists * 2 + (won ? 1 : 0) - st.yellowCards * .5 - st.redCards * 2;
      if (score > bestScore) { bestScore = score; best = [id]; }
      else if (score === bestScore) best.push(id);
    });
    return best.length === 1 ? { mvpId: best[0], mvpTie: null } : { mvpId: null, mvpTie: best };
  },

  async save() {
    const s = this.state;
    const winner = s.scoreA === s.scoreB ? 'draw' : s.scoreA > s.scoreB ? 'A' : 'B';
    const mvp = this.computeMvp(winner);
    const date = new Date(s.dateLocal).toISOString();
    const roster = [...s.teamAIds, ...s.teamBIds];
    const stats = Object.fromEntries(roster.map((id) => [id, Stats.normalizeStat(s.statsMap[id])]));
    const payload = {
      date,
      season: Number(s.season),
      modality: s.modality,
      format: s.format,
      location: s.location,
      teamA: s.teamAName,
      teamB: s.teamBName,
      teamAIds: s.teamAIds,
      teamBIds: s.teamBIds,
      stats,
      scoreA: s.scoreA,
      scoreB: s.scoreB,
      winner,
      ...mvp
    };
    if (s.editingId) await Matches.update(s.editingId, payload);
    else await Matches.add(payload);
    Modal.close();
    Router.go('matches');
    Toast.show('Partida salva!');
  }
};

const State = {
  view: 'home',
  playerId: null,
  matchId: null,
  playerSearch: '',
  seasonFilter: 'todas',
  matchModality: 'todas',
  rankingPeriod: 'geral',
  rankingModality: 'todas',
  rankingType: 'gols'
};

const Router = {
  go(view, data = {}) {
    State.view = view;
    Object.assign(State, data);
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  render() {
    document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
    document.getElementById(`view-${State.view}`)?.classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.nav === State.view));
    if (State.view === 'home') UI.home();
    if (State.view === 'players') UI.players();
    if (State.view === 'player-profile') UI.playerProfile();
    if (State.view === 'matches') UI.matches();
    if (State.view === 'match-detail') UI.matchDetail();
    if (State.view === 'ranking') UI.ranking();
    if (State.view === 'settings') UI.settings();
    UI.header();
  }
};

const UI = {
  header() {
    document.getElementById('league-name-label').textContent = DB.data.leagueName;
    document.getElementById('btn-profile').textContent = Utils.initials(DB.data.leagueName).slice(0, 1);
    const heroSeason = document.getElementById('hero-season');
    if (heroSeason) heroSeason.textContent = DB.data.currentSeason;
  },

  home() {
    const seasonMatches = Matches.bySeason(DB.data.currentSeason);
    const today = seasonMatches.filter((match) => Utils.isSameDay(match.date, Utils.todayISO()));
    const scorer = Stats.ranking('gols', seasonMatches)[0];
    const assister = Stats.ranking('assistencias', seasonMatches)[0];
    document.getElementById('home-today-summary').innerHTML = `
      <div class="stat-card"><div class="stat-value">${today.length}</div><div class="stat-label">Partidas hoje</div><div class="stat-caption">${today.length ? 'bola rolando' : 'sem jogos hoje'}</div></div>
      <div class="stat-card accent"><div class="stat-value">${scorer?.value || 0}</div><div class="stat-label">Artilheiro</div><div class="stat-caption">${Utils.escapeHtml(scorer?.player?.name || 'sem dados')}</div></div>`;
    document.getElementById('home-overall-summary').innerHTML = `
      <div class="stat-card"><div class="stat-value">${assister?.value || 0}</div><div class="stat-label">Mais assistências</div><div class="stat-caption">${Utils.escapeHtml(assister?.player?.name || 'sem dados')}</div></div>
      <div class="stat-card"><div class="stat-value">${Players.all().length}</div><div class="stat-label">Jogadores</div><div class="stat-caption">cadastrados</div></div>`;

    const top = Stats.ranking('gols', seasonMatches).slice(0, 5);
    document.getElementById('home-ranking').innerHTML = top.length ? top.map((r, i) => UI.rankRow(r, i, 'gols')).join('')
      : '<div class="empty-state">Registre uma partida para iniciar a artilharia.</div>';
    document.querySelectorAll('#home-ranking [data-player]').forEach((row) => row.onclick = () => Router.go('player-profile', { playerId: row.dataset.player }));

    document.getElementById('home-recent-matches').innerHTML = seasonMatches.length ? seasonMatches.slice(0, 5).map(UI.matchCard).join('')
      : '<div class="empty-state">Nenhuma partida registrada.</div>';
    document.querySelectorAll('#home-recent-matches [data-match]').forEach((row) => row.onclick = () => Router.go('match-detail', { matchId: row.dataset.match }));
  },

  players() {
    const input = document.getElementById('player-search');
    input.value = State.playerSearch;
    input.oninput = (e) => { State.playerSearch = e.target.value; UI.paintPlayers(); };
    UI.paintPlayers();
  },

  paintPlayers() {
    const list = Players.search(State.playerSearch);
    document.getElementById('players-list').innerHTML = list.length ? list.map((p) => {
      const s = Stats.forPlayer(p.id);
      return `<div class="list-row" data-player="${p.id}">
        ${Utils.avatarHtml(p)}
        <div class="row-main"><div class="row-title">${Utils.escapeHtml(p.name)}</div><div class="row-sub">${Utils.positionLabel(p.position)}${p.goalkeeper && p.position !== 'goleiro' ? ' · também goleiro' : ''} · ${s.games} jogos · ${s.goals} gols · ${s.assists} ast</div></div>
        <div class="row-value"><div class="big">${s.contributions}</div><div class="small">G+A</div></div>
      </div>`;
    }).join('') : '<div class="empty-state">Nenhum jogador encontrado.</div>';
    document.querySelectorAll('#players-list [data-player]').forEach((row) => row.onclick = () => Router.go('player-profile', { playerId: row.dataset.player }));
  },

  playerProfile() {
    const p = Players.byId(State.playerId);
    const wrap = document.getElementById('profile-content');
    if (!p) { wrap.innerHTML = '<div class="empty-state">Jogador não encontrado.</div>'; return; }
    const s = Stats.forPlayer(p.id);
    wrap.innerHTML = `
      <div class="profile-hero">${Utils.avatarHtml(p, 'xl')}<div class="name">${Utils.escapeHtml(p.name)}</div>
        <div class="since">${Utils.positionLabel(p.position)}${p.goalkeeper && p.position !== 'goleiro' ? ' · também goleiro' : ''} · Desde ${Utils.formatDateFull(p.createdAt)}</div>
        <button class="btn-chip" id="pp-edit">Editar jogador</button>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${s.games}</div><div class="stat-label">Jogos</div></div>
        <div class="stat-card"><div class="stat-value">${s.wins}</div><div class="stat-label">Vitórias</div></div>
        <div class="stat-card accent"><div class="stat-value">${s.goals}</div><div class="stat-label">Gols</div></div>
        <div class="stat-card"><div class="stat-value">${s.assists}</div><div class="stat-label">Assistências</div></div>
        <div class="stat-card"><div class="stat-value">${s.contributions}</div><div class="stat-label">G + A</div></div>
        <div class="stat-card"><div class="stat-value">${s.avgGoals}</div><div class="stat-label">Gols/jogo</div></div>
        <div class="stat-card"><div class="stat-value">${s.yellowCards}</div><div class="stat-label">Cartões amarelos</div></div>
        <div class="stat-card"><div class="stat-value">${s.redCards}</div><div class="stat-label">Cartões vermelhos</div></div>
        <div class="stat-card gold"><div class="stat-value">${s.mvps}</div><div class="stat-label">MVPs</div></div>
        <div class="stat-card"><div class="stat-value">${s.winRate}%</div><div class="stat-label">Aproveitamento</div></div>
      </div>
      <div class="section-sub">Recordes pessoais</div>
      <div class="card">
        <div class="record-item"><span class="rlabel">Mais gols em um jogo</span><span class="rvalue">${s.maxGoals}</span></div>
        <div class="record-item"><span class="rlabel">Mais assistências em um jogo</span><span class="rvalue">${s.maxAssists}</span></div>
      </div>
      <div class="section-sub">Últimos jogos</div>
      <div class="card list-card">
        ${s.history.length ? s.history.slice().reverse().slice(0, 10).map((h) => `
          <div class="list-row" data-match="${h.matchId}">
            <div class="row-main"><div class="row-title">${h.draw ? 'Empate' : h.won ? 'Vitória' : 'Derrota'} · ${Utils.formatDateShort(h.date)}</div>
            <div class="row-sub">${h.goals} gols · ${h.assists} ast · ${h.yellowCards} CA · ${h.redCards} CV</div></div>
          </div>`).join('') : '<div class="empty-state">Sem partidas.</div>'}
      </div>`;
    document.getElementById('pp-edit').onclick = () => PlayerForm.open(p.id);
    wrap.querySelectorAll('[data-match]').forEach((row) => row.onclick = () => Router.go('match-detail', { matchId: row.dataset.match }));
  },

  matches() {
    const seasons = DB.data.seasons.slice().sort((a, b) => b - a);
    document.getElementById('matches-season-filter').innerHTML = `
      <button class="filter-chip ${State.seasonFilter === 'todas' ? 'active' : ''}" data-season="todas">Todas</button>
      ${seasons.map((y) => `<button class="filter-chip ${Number(State.seasonFilter) === Number(y) ? 'active' : ''}" data-season="${y}">${y}</button>`).join('')}`;
    document.querySelectorAll('#matches-season-filter [data-season]').forEach((b) => b.onclick = () => { State.seasonFilter = b.dataset.season; UI.matches(); });

    const modalities = [['todas', 'Todas modalidades'], ['futebol', 'Futebol'], ['futsal', 'Futsal'], ['society', 'Society']];
    document.getElementById('matches-modality-filter').innerHTML = modalities.map(([key, label]) =>
      `<button class="filter-chip ${State.matchModality === key ? 'active' : ''}" data-modality="${key}">${label}</button>`).join('');
    document.querySelectorAll('#matches-modality-filter [data-modality]').forEach((button) => button.onclick = () => {
      State.matchModality = button.dataset.modality; UI.matches();
    });
    let list = State.seasonFilter === 'todas' ? Matches.all() : Matches.bySeason(State.seasonFilter);
    if (State.matchModality !== 'todas') list = list.filter((match) => match.modality === State.matchModality);
    document.getElementById('matches-list').innerHTML = list.length ? list.map(UI.matchCard).join('')
      : '<div class="empty-state">Nenhuma partida neste filtro.</div>';
    document.querySelectorAll('#matches-list [data-match]').forEach((row) => row.onclick = () => Router.go('match-detail', { matchId: row.dataset.match }));
  },

  matchCard(m) {
    const aWin = m.winner === 'A', bWin = m.winner === 'B';
    const mvp = m.mvpId ? Players.byId(m.mvpId)?.name
      : Array.isArray(m.mvpTie) ? m.mvpTie.map((id) => Players.byId(id)?.name).filter(Boolean).join(' / ') : '';
    return `<div class="match-card" data-match="${m.id}">
      <div class="mc-date">${Utils.formatDateShort(m.date)} · ${Utils.modalityLabel(m.modality)} · ${m.format}</div>
      <div class="mc-line ${aWin ? 'win' : ''}"><span>${Utils.escapeHtml(m.teamA)}</span><span class="mc-score">${m.scoreA}</span></div>
      <div class="mc-line ${bWin ? 'win' : ''}"><span>${Utils.escapeHtml(m.teamB)}</span><span class="mc-score">${m.scoreB}</span></div>
      <div class="mc-footer"><span class="mc-win">${m.winner === 'draw' ? 'Empate' : 'Vencedor: ' + Utils.escapeHtml(aWin ? m.teamA : m.teamB)}</span><span class="mc-mvp">${mvp ? 'MVP: ' + Utils.escapeHtml(mvp) : ''}</span></div>
    </div>`;
  },

  matchDetail() {
    const m = Matches.byId(State.matchId);
    const wrap = document.getElementById('match-detail-content');
    if (!m) { wrap.innerHTML = '<div class="empty-state">Partida não encontrada.</div>'; return; }

    const roster = (ids) => ids.map((id) => {
      const p = Players.byId(id);
      const s = Stats.normalizeStat(m.stats?.[id]);
      const isMvp = m.mvpId === id || (Array.isArray(m.mvpTie) && m.mvpTie.includes(id));
      return `<div class="list-row">
        ${Utils.avatarHtml(p || { name: '?' }, 'sm')}
        <div class="row-main"><div class="row-title">${Utils.escapeHtml(p?.name || 'Jogador removido')}${isMvp ? ' (MVP)' : ''}</div>
        <div class="row-sub">${s.goals} gols · ${s.assists} ast · ${s.yellowCards} CA · ${s.redCards} CV</div></div>
      </div>`;
    }).join('');

    wrap.innerHTML = `
      <div class="football-match-hero">
        <div class="football-match-meta">${Utils.modalityLabel(m.modality)} · ${m.format} · ${Utils.formatDateTime(m.date)}${m.location ? ` · ${Utils.escapeHtml(m.location)}` : ''}</div>
        <div class="football-big-score"><span>${Utils.escapeHtml(m.teamA)}</span><strong>${m.scoreA} × ${m.scoreB}</strong><span>${Utils.escapeHtml(m.teamB)}</span></div>
      </div>
      <div class="section-sub">${Utils.escapeHtml(m.teamA)}</div><div class="card list-card">${roster(m.teamAIds)}</div>
      <div class="section-sub">${Utils.escapeHtml(m.teamB)}</div><div class="card list-card">${roster(m.teamBIds)}</div>
      <div class="football-detail-actions">
        <button class="btn-secondary" id="md-edit">Editar partida</button>
        <button class="btn-danger" id="md-delete">Excluir</button>
      </div>`;
    document.getElementById('md-edit').onclick = () => MatchWizard.open(m.id);
    document.getElementById('md-delete').onclick = () => Modal.confirm(
      'Excluir partida', 'Esta partida será removida do histórico e dos rankings.',
      async () => { await Matches.remove(m.id); Router.go('matches'); Toast.show('Partida excluída.'); }, 'Excluir'
    );
  },

  ranking() {
    const periods = [['geral', 'Geral'], ['temporada', `Temporada ${DB.data.currentSeason}`], ['hoje', 'Hoje']];
    const modalities = [['todas', 'Todas modalidades'], ['futebol', 'Futebol'], ['futsal', 'Futsal'], ['society', 'Society']];
    const types = [
      ['gols', 'Gols'], ['assistencias', 'Assistências'], ['participacoes', 'G+A'],
      ['vitorias', 'Vitórias'], ['mvp', 'MVP'], ['media', 'Média'], ['disciplina', 'Disciplina']
    ];
    document.getElementById('ranking-period-filter').innerHTML = periods.map(([key, label]) =>
      `<button class="filter-chip ${State.rankingPeriod === key ? 'active' : ''}" data-period="${key}">${label}</button>`).join('');
    document.getElementById('ranking-modality-filter').innerHTML = modalities.map(([key, label]) =>
      `<button class="filter-chip ${State.rankingModality === key ? 'active' : ''}" data-ranking-modality="${key}">${label}</button>`).join('');
    document.getElementById('ranking-type-filter').innerHTML = types.map(([key, label]) =>
      `<button class="filter-chip ${State.rankingType === key ? 'active' : ''}" data-type="${key}">${label}</button>`).join('');
    document.querySelectorAll('#ranking-period-filter [data-period]').forEach((b) => b.onclick = () => { State.rankingPeriod = b.dataset.period; UI.ranking(); });
    document.querySelectorAll('#ranking-modality-filter [data-ranking-modality]').forEach((button) => button.onclick = () => {
      State.rankingModality = button.dataset.rankingModality; UI.ranking();
    });
    document.querySelectorAll('#ranking-type-filter [data-type]').forEach((b) => b.onclick = () => { State.rankingType = b.dataset.type; UI.ranking(); });

    let matches = Stats.period(State.rankingPeriod);
    if (State.rankingModality !== 'todas') matches = matches.filter((match) => match.modality === State.rankingModality);
    const rows = Stats.ranking(State.rankingType, matches);
    document.getElementById('ranking-list').innerHTML = rows.length ? rows.map((r, i) => UI.rankRow(r, i, State.rankingType)).join('')
      : '<div class="empty-state">Sem dados para este ranking.</div>';
    document.querySelectorAll('#ranking-list [data-player]').forEach((row) => row.onclick = () => Router.go('player-profile', { playerId: row.dataset.player }));
  },

  rankRow(r, i, type) {
    const unit = ({ gols: 'gols', assistencias: 'ast', participacoes: 'G+A', vitorias: 'vitórias', mvp: 'MVP', media: 'g/j', disciplina: 'pts' })[type] || '';
    return `<div class="list-row" data-player="${r.player.id}">
      <div class="rank-pos ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
      ${Utils.avatarHtml(r.player, 'sm')}
      <div class="row-main"><div class="row-title">${Utils.escapeHtml(r.player.name)}</div><div class="row-sub">${r.stats.games} jogos · ${r.stats.goals}G ${r.stats.assists}A</div></div>
      <div class="row-value"><div class="big">${r.value}</div><div class="small">${unit}</div></div>
    </div>`;
  },

  settings() {
    const input = document.getElementById('settings-league-name');
    input.value = DB.data.leagueName;
    input.onchange = async () => {
      DB.data.leagueName = input.value.trim() || 'GOLAÇO!score';
      await DB.save(); UI.header(); Toast.show('Nome atualizado.');
    };
  }
};

const SeasonManager = {
  open() {
    const seasons = DB.data.seasons.slice().sort((a, b) => b - a);
    Modal.open(`
      <div class="modal-header"><h2>Temporadas</h2><button class="modal-close" id="sm-close">✕</button></div>
      <div class="modal-body">
        <div class="card list-card">
          ${seasons.map((y) => `<div class="list-row"><div class="row-main"><div class="row-title">Temporada ${y}</div><div class="row-sub">${Matches.bySeason(y).length} partidas</div></div>
          ${Number(y) === Number(DB.data.currentSeason) ? '<span class="badge-pill">Atual</span>' : `<button class="btn-chip" data-use="${y}">Usar</button>`}</div>`).join('')}
        </div>
        <button class="btn-secondary" id="sm-add" style="width:100%;margin-top:12px;">+ Próxima temporada</button>
      </div>`);
    document.getElementById('sm-close').onclick = Modal.close;
    document.querySelectorAll('[data-use]').forEach((b) => b.onclick = async () => {
      DB.data.currentSeason = Number(b.dataset.use); await DB.save(); SeasonManager.open(); Router.render();
    });
    document.getElementById('sm-add').onclick = async () => {
      const next = Math.max(...DB.data.seasons.map(Number)) + 1;
      DB.data.seasons.push(next); DB.data.currentSeason = next; await DB.save();
      SeasonManager.open(); Router.render(); Toast.show(`Temporada ${next} criada.`);
    };
  }
};

const DataTransfer = {
  async export() {
    const response = await apiFetch(`${API_BASE}/api/db/backup`);
    if (!response.ok) throw new Error('Falha ao exportar backup.');
    const backup = await response.json();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `golaco-score-${Utils.todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },
  async import(file) {
    const backup = JSON.parse(await file.text());
    const response = await apiFetch(`${API_BASE}/api/db/restore`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(backup)
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Falha ao importar.');
    await Promise.all([DB.load(), Players.load(), Matches.load()]);
    Router.go('home');
  },
  async reset() {
    const response = await apiFetch(`${API_BASE}/api/db/reset`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Falha ao apagar dados.');
    await DB.reset();
    await Promise.all([Players.load(), Matches.load()]);
  }
};

let appBound = false;

async function startAuthenticatedApp() {
  Auth.showApp();
  await DB.load();
  const loaded = await Promise.allSettled([Players.load(), Matches.load()]);
  if (loaded.some((r) => r.status === 'rejected')) Toast.show('Erro ao carregar dados.');

  if (!appBound) {
    appBound = true;
    document.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', () => Router.go(el.dataset.nav)));
    document.getElementById('btn-open-register').onclick = () => MatchWizard.open();
    document.getElementById('btn-open-register-2').onclick = () => MatchWizard.open();
    document.getElementById('btn-add-player').onclick = () => PlayerForm.open();
    document.getElementById('btn-profile').onclick = () => Router.go('settings');
    document.getElementById('btn-manage-seasons').onclick = () => SeasonManager.open();
    document.getElementById('btn-logout').onclick = () => Auth.logout();

    document.getElementById('btn-install-app').onclick = async () => {
      if (!deferredInstallPrompt) return Toast.show('Use "Adicionar à tela inicial" no menu do navegador.');
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    };

    document.getElementById('btn-export').onclick = async () => {
      try { await DataTransfer.export(); Toast.show('Backup exportado.'); } catch (err) { Toast.show(err.message); }
    };
    document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = async (e) => {
      if (!e.target.files[0]) return;
      try { await DataTransfer.import(e.target.files[0]); Toast.show('Backup importado.'); } catch (err) { Toast.show(err.message); }
      e.target.value = '';
    };
    document.getElementById('btn-reset').onclick = () => Modal.confirm(
      'Apagar todos os dados', 'Isso excluirá jogadores, partidas e configurações desta instalação.',
      async () => { await DataTransfer.reset(); Router.go('home'); Toast.show('Dados apagados.'); }, 'Apagar tudo'
    );
  }

  Router.render();
}

async function initApp() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(console.warn));
  }

  document.getElementById('login-form').onsubmit = async (event) => {
    event.preventDefault();
    const button = document.getElementById('login-submit');
    const error = document.getElementById('login-error');
    error.classList.add('hidden');
    button.disabled = true;
    button.textContent = 'Entrando...';
    try {
      await Auth.login(document.getElementById('login-username').value.trim(), document.getElementById('login-password').value);
      document.getElementById('login-password').value = '';
      await startAuthenticatedApp();
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove('hidden');
    } finally {
      button.disabled = false;
      button.textContent = 'Entrar';
    }
  };

  if (await Auth.restore()) await startAuthenticatedApp();
  else Auth.showLogin();
}

document.addEventListener('DOMContentLoaded', initApp);
