/* PT-PT Videos — Frontend App */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Category translations (YouTube → pt-PT)
  // -------------------------------------------------------------------------
  const CATEGORY_PT = {
    'Education':             'Educação',
    'Entertainment':         'Entretenimento',
    'Film & Animation':      'Cinema & Animação',
    'Gaming':                'Videojogos',
    'Howto & Style':         'Tutoriais & Estilo',
    'Music':                 'Música',
    'News & Politics':       'Notícias & Política',
    'Nonprofits & Activism': 'Causas & Activismo',
    'People & Blogs':        'Pessoas & Blogues',
    'Science & Technology':  'Ciência & Tecnologia',
    'Sports':                'Desporto',
    'Travel & Events':       'Viagens & Eventos',
    'Infantil':              'Infantil',
  };

  function translateCategory(cat) {
    return CATEGORY_PT[cat] || cat;
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const state = {
    videos: [],        // all accepted videos from videos.json
    activeCategory: 'all',
    searchQuery: '',
    debounceTimer: null,
  };

  // -------------------------------------------------------------------------
  // Formatting helpers
  // -------------------------------------------------------------------------

  function formatDuration(iso) {
    if (!iso) return '';
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return '';
    const h = parseInt(m[1] || 0, 10);
    const min = parseInt(m[2] || 0, 10);
    const sec = parseInt(m[3] || 0, 10);
    if (h > 0) {
      return h + ':' + String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
    return min + ':' + String(sec).padStart(2, '0');
  }

  function formatViews(n) {
    if (typeof n !== 'number' || isNaN(n)) return '';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return Math.round(n / 1_000) + 'K';
    return String(n);
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (_) {
      return iso.slice(0, 10);
    }
  }

  function formatLastUpdated(iso) {
    if (!iso) return 'nunca';
    try {
      return new Date(iso).toLocaleString('pt-PT', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (_) {
      return iso;
    }
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(video) {
    const thumbUrl = video.thumbnail
      || ('https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg');
    const ytUrl = 'https://www.youtube.com/watch?v=' + encodeURIComponent(video.id);
    const duration = formatDuration(video.duration);
    const views = formatViews(video.view_count);
    const date = formatDate(video.published_at);
    const category = video.category_name ? translateCategory(video.category_name) : '';

    return `<a href="${esc(ytUrl)}" target="_blank" rel="noopener noreferrer" class="video-card" aria-label="${esc(video.title)}">
  <div class="card-thumb-wrap">
    <img class="card-thumb" src="${esc(thumbUrl)}" alt="" loading="lazy" onerror="this.style.opacity='0.3'">
    ${duration ? `<span class="card-duration">${esc(duration)}</span>` : ''}
  </div>
  <div class="card-body">
    <div class="card-title">${esc(video.title)}</div>
    <div class="card-channel">${esc(video.channel_name || '')}</div>
    <div class="card-meta">
      ${views ? `<span>${esc(views)} visualizações</span>` : ''}
      ${date ? `<span>${esc(date)}</span>` : ''}
      ${category ? `<span>${esc(category)}</span>` : ''}
    </div>
  </div>
</a>`;
  }

  function renderGrid(filtered) {
    const grid = document.getElementById('video-grid');
    const noResults = document.getElementById('no-results');

    if (filtered.length === 0) {
      grid.innerHTML = '';
      noResults.classList.remove('hidden');
      document.getElementById('no-results-query').textContent =
        state.searchQuery || translateCategory(state.activeCategory);
    } else {
      noResults.classList.add('hidden');
      grid.innerHTML = filtered.map(renderCard).join('');
    }
  }

  function renderStats(data, filteredCount) {
    const el = document.getElementById('stat-videos');
    const showing = filteredCount !== data.total_videos
      ? `${filteredCount} de ${data.total_videos}`
      : String(data.total_videos);
    const updated = formatLastUpdated(data.last_updated);

    el.innerHTML =
      `<strong>${esc(showing)}</strong> vídeo${data.total_videos === 1 ? '' : 's'} &middot; ` +
      `<strong>${esc(String(data.total_channels))}</strong> cana${data.total_channels === 1 ? 'l' : 'is'} &middot; ` +
      `Actualizado: ${esc(updated)}`;
  }

  function renderCategories(categories) {
    const wrap = document.getElementById('categories-wrap');
    const pills = ['all', ...Array.from(categories).sort()];

    wrap.innerHTML = pills.map((cat) => {
      const label = cat === 'all' ? 'Todos' : translateCategory(cat);
      const active = cat === state.activeCategory ? ' active' : '';
      return `<button class="category-pill${active}" data-category="${esc(cat)}">${esc(label)}</button>`;
    }).join('');

    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-pill');
      if (!btn) return;
      state.activeCategory = btn.dataset.category;
      wrap.querySelectorAll('.category-pill').forEach((p) =>
        p.classList.toggle('active', p.dataset.category === state.activeCategory)
      );
      applyFilters();
    });
  }

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  function applyFilters() {
    let results = state.videos;

    if (state.activeCategory !== 'all') {
      results = results.filter((v) => v.category_name === state.activeCategory);
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      results = results.filter(
        (v) =>
          (v.title || '').toLowerCase().includes(q) ||
          (v.channel_name || '').toLowerCase().includes(q) ||
          (v.description || '').toLowerCase().includes(q)
      );
    }

    renderGrid(results);

    const statEl = document.getElementById('stat-videos');
    if (statEl) {
      const fullData = window.__ptptData;
      if (fullData) renderStats(fullData, results.length);
    }
  }

  // -------------------------------------------------------------------------
  // Search input
  // -------------------------------------------------------------------------

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
      state.activeCategory = 'all';
      document.querySelectorAll('.category-pill').forEach((p) =>
        p.classList.toggle('active', p.dataset.category === 'all')
      );
      applyFilters();
    });
  }

  // -------------------------------------------------------------------------
  // Bootstrap
  // -------------------------------------------------------------------------

  async function init() {
    let data;
    try {
      const resp = await fetch('videos.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      data = await resp.json();
    } catch (err) {
      document.getElementById('video-grid').innerHTML =
        '<div class="empty-state"><p>Erro ao carregar os vídeos. Tente mais tarde.</p></div>';
      console.error('Failed to load videos.json:', err);
      return;
    }

    window.__ptptData = data;
    state.videos = data.videos || [];

    if (state.videos.length === 0) {
      document.getElementById('video-grid').innerHTML =
        '<div class="empty-state"><p>Ainda não há vídeos indexados. Volte mais tarde.</p></div>';
      document.getElementById('stat-videos').textContent = '0 vídeos';
      return;
    }

    const categories = new Set(
      state.videos.map((v) => v.category_name).filter(Boolean)
    );

    renderCategories(categories);
    renderStats(data, state.videos.length);
    renderGrid(state.videos);
    initSearch();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
