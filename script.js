/* QQFIT – лендинг. Чистый JS, без внешних подключений. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Значок Google Play: если файла пока нет, держим место ---------- */
  document.querySelectorAll('.gp-badge img').forEach(function (img) {
    var mark = function () { img.closest('.gp-badge').classList.add('is-missing'); };
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener('error', mark);
    // lazy-картинка могла ещё не начать загрузку – проверим, когда загрузится страница
    window.addEventListener('load', function () {
      if (img.complete && img.naturalWidth === 0) mark();
    });
  });

  /* ---------- Шаг 80 мс внутри групп ---------- */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    group.querySelectorAll('[data-reveal]').forEach(function (el, i) {
      el.style.setProperty('--i', i);
    });
  });

  /* ---------- Досчёт чисел ---------- */
  function countUp(el) {
    var to = parseInt(el.getAttribute('data-to'), 10);
    if (isNaN(to) || el.dataset.done) return;
    el.dataset.done = '1';
    if (reduceMotion) { el.textContent = to; return; }
    var dur = 1100 + Math.min(to, 300) * 2;
    var start = null;
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll('.count');
  var revealEls = document.querySelectorAll('[data-reveal], .ladder');

  if (reduceMotion || !hasIO) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    counters.forEach(function (el) { el.dataset.done = '1'; });
  } else {
    // числа стартуют с нуля, только если JS и анимации включены
    counters.forEach(function (el) {
      var w = el.textContent.length;
      el.style.display = 'inline-block';
      el.style.minWidth = w + 'ch';
      el.style.textAlign = 'right';
      el.textContent = '0';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-visible');
        el.querySelectorAll && el.querySelectorAll('.count').forEach(countUp);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealEls.forEach(function (el) { io.observe(el); });

    // счётчики вне [data-reveal]
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Видео ---------- */
  var video = document.querySelector('.levelup__video');
  if (video) {
    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.pause();
      video.preload = 'none';
      video.load(); // вернуть постер
    } else if (hasIO) {
      // играем только когда видно – экономим батарею
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.25 });
      vio.observe(video);
    }
  }
})();

/* ---------- Сцена «Рост ранга»: грудь от Бронзы до Олимпии ----------
   Анимируются только transform и opacity (Web Animations API), поэтому
   браузер рисует её на видеокарте. Пока сцену не видно — она на паузе. */
(function () {
  'use strict';
  var stage = document.querySelector('[data-rankshow]');
  if (!stage) return;

  var RANKS = [{"name": "Бронза", "glow": "#D6B495", "frame": "#B5763F", "pat": "#E1C8B2"}, {"name": "Серебро", "glow": "#DFE2E6", "frame": "#C4CAD2", "pat": "#E7EAED"}, {"name": "Золото", "glow": "#EACE8C", "frame": "#D9A62E", "pat": "#F0DBAB"}, {"name": "Платина", "glow": "#95D6D4", "frame": "#3FB5B1", "pat": "#B2E1E0"}, {"name": "Алмаз", "glow": "#A5CAF1", "frame": "#5C9EE6", "pat": "#BED8F5"}, {"name": "Спартанец", "glow": "#DE888B", "frame": "#C3262C", "pat": "#E7A8AB"}, {"name": "Герой", "glow": "#C7A5EE", "frame": "#9A5BE0", "pat": "#D7BDF3"}, {"name": "Титан", "glow": "#F7AD82", "frame": "#F06A1C", "pat": "#F9C3A4"}, {"name": "Олимпия", "glow": "#EDDCBD", "frame": "#DEBF87", "pat": "#F2E5CF"}];
  var LAST = RANKS.length - 1;
  var HOLD = 1350, FINAL_HOLD = 3100;

  var layers = stage.querySelectorAll('.rs-bg');
  var medals = stage.querySelectorAll('.rs-medal');
  var steps = stage.querySelectorAll('.rs-ladder li');
  var sparks = stage.querySelectorAll('.rs-spark');
  var nameEl = stage.querySelector('.rs-name');
  var chip = stage.querySelector('.rs-chip');
  var ring = stage.querySelector('.rs-ring');
  var flash = stage.querySelector('.rs-flash');
  var halo = stage.querySelector('.rs-halo');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = typeof stage.animate === 'function';
  if (reduce || !canAnimate || layers.length !== RANKS.length || medals.length !== RANKS.length) {
    stage.classList.add('is-paused');
    return; // остаётся статичный кадр: Олимпия и вся лестница
  }

  function stopAnims(el) {
    if (el.getAnimations) el.getAnimations().forEach(function (a) { a.cancel(); });
  }
  function run(el, keyframes, options) {
    stopAnims(el);
    var a = el.animate(keyframes, options);
    return a.finished ? a.finished.catch(function () {}) : Promise.resolve();
  }
  function fire(el, keyframes, options) {
    var a = el.animate(keyframes, options);
    return a.finished ? a.finished.catch(function () {}) : Promise.resolve();
  }

  function setLadder(idx) {
    for (var k = 0; k < steps.length; k++) {
      steps[k].classList.toggle('is-done', k < idx);
      steps[k].classList.toggle('is-current', k === idx);
    }
  }

  function burst(idx, big, delay) {
    var r = RANKS[idx];
    ring.style.borderColor = r.glow;
    fire(ring, [
      { opacity: 0.95, transform: 'translate(-50%, -50%) scale(.32)' },
      { opacity: 0, transform: 'translate(-50%, -50%) scale(' + (big ? 2.3 : 1.85) + ')' }
    ], { duration: big ? 820 : 640, delay: delay, easing: 'cubic-bezier(.2,.7,.3,1)' });
    fire(flash, [{ opacity: 0 }, { opacity: big ? 0.55 : 0.36, offset: 0.22 }, { opacity: 0 }],
      { duration: big ? 560 : 420, delay: delay, easing: 'ease-out' });
    var colors = [r.glow, r.frame, '#FFFFFF'];
    var n = sparks.length;
    for (var k = 0; k < n; k++) {
      var angle = (k / n) * Math.PI * 2 + (k % 2 ? 0.17 : -0.11) + idx * 0.4;
      var dist = (big ? 150 : 112) + (k % 3) * 20;
      var dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist * 0.92 - 8;
      var rot = (k % 2 ? 1 : -1) * (120 + k * 14);
      var s = sparks[k];
      s.style.background = colors[k % 3];
      fire(s, [
        { opacity: 1, transform: 'translate(-50%, -50%) translate(0px, 0px) rotate(0deg) scale(1)' },
        { opacity: 1, offset: 0.55 },
        { opacity: 0, transform: 'translate(-50%, -50%) translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) rotate(' + rot + 'deg) scale(.35)' }
      ], { duration: 760 + (k % 4) * 70, delay: delay + (k % 3) * 18, easing: 'cubic-bezier(.12,.75,.3,1)' });
    }
  }

  var cur = LAST; // на старте показан статичный кадр Олимпии
  function reveal(idx) {
    var r = RANKS[idx], old = cur;
    cur = idx;
    if (old !== idx) {
      run(medals[old], [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(.55) translateY(14px)' }
      ], { duration: 230, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
      run(layers[old], [{ opacity: 1 }, { opacity: 0 }], { duration: 620, easing: 'ease-in-out', fill: 'forwards' });
    }
    run(layers[idx], [{ opacity: 0 }, { opacity: 1 }], { duration: 620, easing: 'ease-in-out', fill: 'forwards' });
    run(medals[idx], [
      { opacity: 0, transform: 'scale(.3) rotate(-14deg)' },
      { opacity: 1, transform: 'scale(1.16) rotate(3deg)', offset: 0.55 },
      { opacity: 1, transform: 'scale(.97) rotate(-1deg)', offset: 0.8 },
      { opacity: 1, transform: 'scale(1) rotate(0deg)' }
    ], { duration: 700, delay: 170, easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'both' });
    burst(idx, idx === LAST, 300);
    if (idx === LAST) burst(idx, true, 760);
    run(chip, [
      { opacity: 0, transform: 'scale(.6)' },
      { opacity: 1, transform: 'scale(1.1)', offset: 0.6 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 380, delay: 220, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' });
    run(nameEl, [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-8px)' }
    ], { duration: 150, easing: 'ease-in', fill: 'forwards' }).then(function () {
      if (cur !== idx) return;
      nameEl.textContent = r.name;
      nameEl.style.color = r.pat;
      run(nameEl, [
        { opacity: 0, transform: 'scale(1.75)' },
        { opacity: 1, transform: 'scale(.94)', offset: 0.6 },
        { opacity: 1, transform: 'scale(1)' }
      ], { duration: 480, delay: 200, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    });
    if (idx === LAST) {
      run(halo, [
        { opacity: 0, transform: 'scale(.8)' },
        { opacity: 0.9, transform: 'scale(1.05)', offset: 0.3 },
        { opacity: 0.45, transform: 'scale(.95)', offset: 0.6 },
        { opacity: 0.85, transform: 'scale(1.05)', offset: 0.8 },
        { opacity: 0, transform: 'scale(1)' }
      ], { duration: FINAL_HOLD, delay: 300, easing: 'ease-in-out' });
    }
    setLadder(idx);
  }

  var timer = null, running = false;
  function tick() {
    if (!running) return;
    var next = (cur + 1) % RANKS.length;
    reveal(next);
    timer = setTimeout(tick, next === LAST ? FINAL_HOLD : HOLD);
  }
  function start() {
    if (running) return;
    running = true;
    stage.classList.remove('is-paused');
    timer = setTimeout(tick, 250);
  }
  function stop() {
    running = false;
    clearTimeout(timer);
    stage.classList.add('is-paused');
  }

  var imgs = stage.querySelectorAll('img');
  function ready() {
    var list = [];
    imgs.forEach(function (im) {
      im.loading = 'eager';
      if (im.decode) list.push(im.decode().catch(function () {}));
    });
    return Promise.all(list);
  }

  var visible = false, prepared = null;
  function update() {
    if (visible && !document.hidden) {
      if (!prepared) prepared = ready();
      prepared.then(function () { if (visible && !document.hidden) start(); });
    } else {
      stop();
    }
  }
  stage.classList.add('is-paused');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.35 }).observe(stage);
  } else {
    visible = true; update();
  }
  document.addEventListener('visibilitychange', update);
})();
