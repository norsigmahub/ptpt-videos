/* PT-PT Videos — Canais page */

(function () {
  'use strict';

  const state = {
    channels: [],
    searchQuery: '',
    debounceTimer: null,
  };

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(ch) {
    const ytUrl = 'https://www.youtube.com/channel/' + encodeURIComponent(ch.channel_id);
    const initial = (ch.channel_name || '?').trim()[0].toUpperCase();
    return `<a href="${esc(ytUrl)}" target="_blank" rel="noopener noreferrer" class="channel-card" aria-label="${esc(ch.channel_name)}">
  <div class="channel-avatar">${esc(initial)}</div>
  <div class="channel-body">
    <div class="channel-name">${esc(ch.channel_name)}</div>
    <div class="channel-meta">${ch.video_count} vídeo${ch.video_count === 1 ? '' : 's'}</div>
  </div>
</a>`;
  }

  function renderGrid(filtered) {
    const grid = document.getElementById('channel-grid');
    const noResults = document.getElementById('no-results');
    if (filtered.length === 0) {
      grid.innerHTML = '';
      noResults.classList.remove('hidden');
      document.getElementById('no-results-query').textContent = state.searchQuery;
    } else {
      noResults.classList.add('hidden');
      grid.innerHTML = filtered.map(renderCard).join('');
    }
  }

  function applyFilters() {
    let results = state.channels;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      results = results.filter((ch) => ch.channel_name.toLowerCase().includes(q));
    }
    renderGrid(results);
  }

  function initSearch() {
    const input = document.getElementById('search');
    input.addEventListener('input', () => {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => {
        state.searchQuery = input.value.trim();
        applyFilters();
      }, 250);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      input.value = '';
      state.searchQuery = '';
      applyFilters();
    });
  }

  async function init() {
    let data;
    try {
      const resp = await fetch('videos.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      data = await resp.json();
    } catch (err) {
      document.getElementById('channel-grid').innerHTML =
        '<div class="empty-state"><p>Erro ao carregar os dados. Tente mais tarde.</p></div>';
      console.error('Failed to load videos.json:', err);
      return;
    }

    // Aggregate channels
    const map = new Map();
    for (const v of (data.videos || [])) {
      if (!v.channel_id) continue;
      if (map.has(v.channel_id)) {
        map.get(v.channel_id).video_count++;
      } else {
        map.set(v.channel_id, {
          channel_id: v.channel_id,
          channel_name: v.channel_name || v.channel_id,
          video_count: 1,
        });
      }
    }

    // Sort by video count desc, then name asc
    state.channels = Array.from(map.values()).sort((a, b) => {
      if (b.video_count !== a.video_count) return b.video_count - a.video_count;
      return a.channel_name.localeCompare(b.channel_name, 'pt');
    });

    const statEl = document.getElementById('stat-channels');
    statEl.innerHTML = `<strong>${state.channels.length}</strong> cana${state.channels.length === 1 ? 'l' : 'is'}`;

    renderGrid(state.channels);
    initSearch();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
