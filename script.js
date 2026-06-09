
(function(){
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks){
    menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === location.pathname.split('/').pop()) {
      a.classList.add('active');
    }
  });

  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold: 0.18});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  const counters = document.querySelectorAll('[data-count]');
  if (counters.length){
    const countObs = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        let current = 0;
        const step = Math.max(1, Math.floor(target/60));
        const tick = () => {
          current += step;
          if(current >= target){
            el.textContent = target + suffix;
            return;
          }
          el.textContent = current + suffix;
          requestAnimationFrame(tick);
        };
        tick();
        countObs.unobserve(el);
      });
    }, {threshold: 0.4});
    counters.forEach(el=>countObs.observe(el));
  }

  const filterBtns = document.querySelectorAll('[data-filter]');
  const productCards = document.querySelectorAll('[data-category]');
  if (filterBtns.length && productCards.length){
    filterBtns.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        filterBtns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        productCards.forEach(card=>{
          const show = filter === 'all' || card.dataset.category === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }
})();
