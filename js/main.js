async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.id) node.id = opts.id;
  if (opts.text) node.textContent = opts.text;
  if (opts.html) node.innerHTML = opts.html;
  if (opts.href) node.href = opts.href;
  if (opts.target) node.target = opts.target;
  if (opts.rel) node.rel = opts.rel;
  if (opts.src) node.src = opts.src;
  if (opts.alt) node.alt = opts.alt;
  if (opts.loading) node.loading = opts.loading;
  children.forEach(c => c && node.appendChild(c));
  return node;
}

function typeText(target, text, speed = 18) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.textContent = text;
    return;
  }
  target.textContent = '';
  target.classList.add('typing');
  let i = 0;
  (function tick() {
    if (i <= text.length) {
      target.textContent = text.slice(0, i);
      i++;
      setTimeout(tick, speed);
    } else {
      target.classList.remove('typing');
    }
  })();
}

function renderAbout(about) {
  const eyebrow = document.getElementById('hero-eyebrow');
  const tagline = document.getElementById('hero-tagline');
  const container = document.getElementById('about-content');
  if (!eyebrow || !tagline || !container) return;

  eyebrow.textContent = about.title;
  typeText(tagline, about.tagline);

  about.bio.forEach(paragraph => {
    container.appendChild(el('p', { text: paragraph }));
  });
}

function renderExperience(jobs) {
  const list = document.getElementById('experience-list');
  if (!list) return;
  jobs.forEach(job => {
    const bullets = el('ul', {}, job.bullets.map(b => el('li', { text: b })));
    const item = el('div', { className: 'experience-item' }, [
      el('h3', { text: `${job.title} — ${job.company}` }),
      el('p', { className: 'exp-meta', text: `${job.location} · ${job.dates}` }),
      bullets
    ]);
    list.appendChild(item);
  });
}

function buildProjectCardFull(project) {
  const challenges = el('ul', {}, project.challenges.map(c => el('li', { text: c })));
  const outcomes = el('ul', {}, project.outcomes.map(o => el('li', { text: o })));
  const tags = el('div', { className: 'tag-row' }, project.tags.map(t => el('span', { className: 'tag', text: t })));

  const bodyChildren = [];
  if (project.demoUrl) bodyChildren.push(el('span', { className: 'demo-badge', text: 'Interactive Demo' }));
  bodyChildren.push(
    el('h3', { text: project.title }),
    el('p', { className: 'project-tagline', text: project.tagline })
  );
  if (project.demoUrl || project.dataSheetUrl) {
    const ctaButtons = [];
    if (project.demoUrl) {
      ctaButtons.push(el('a', { className: 'btn btn-primary', href: project.demoUrl, text: 'Launch Interactive Demo →' }));
    }
    if (project.dataSheetUrl) {
      ctaButtons.push(el('a', { className: 'btn btn-outline', href: project.dataSheetUrl, text: 'View Example Data Sheet' }));
    }
    bodyChildren.push(el('div', { className: 'project-cta-row' }, ctaButtons));
  }
  bodyChildren.push(
    el('h4', { text: 'Objective' }),
    el('p', { text: project.objective }),
    el('h4', { text: 'Challenges' }),
    challenges,
    el('h4', { text: 'Outcomes' }),
    outcomes,
    tags
  );

  const body = el('div', { className: 'project-card-body' }, bodyChildren);

  const card = el('article', { className: 'project-card', id: project.id });
  card.appendChild(body);

  if (project.images && project.images.length) {
    const gallery = el('div', { className: 'project-gallery' },
      project.images.map(img => el('img', { src: img.src, alt: img.alt, loading: 'lazy' }))
    );
    card.appendChild(gallery);
  }

  return card;
}

function buildProjectCardPreview(project) {
  const tags = el('div', { className: 'tag-row' }, project.tags.map(t => el('span', { className: 'tag', text: t })));
  const thumb = project.images && project.images[0]
    ? el('img', { className: 'project-preview-thumb', src: project.images[0].src, alt: project.images[0].alt, loading: 'lazy' })
    : null;

  const previewChildren = [];
  if (project.demoUrl) previewChildren.push(el('span', { className: 'demo-badge', text: 'Interactive Demo' }));
  previewChildren.push(
    el('h3', { text: project.title }),
    el('p', { className: 'project-tagline', text: project.tagline }),
    tags,
    el('span', { className: 'view-details-link', text: 'View Details →' })
  );
  const body = el('div', { className: 'project-card-body' }, previewChildren);

  const card = el('a', { className: 'project-card project-card--preview', href: `projects.html#${project.id}` });
  if (thumb) card.appendChild(thumb);
  card.appendChild(body);
  return card;
}

function renderProjectsFull(projects) {
  const list = document.getElementById('projects-list');
  if (!list) return;
  projects.forEach(project => list.appendChild(buildProjectCardFull(project)));
}

function renderProjectsPreview(projects) {
  const list = document.getElementById('projects-preview-list');
  if (!list) return;
  projects.filter(p => p.homepage).forEach(project => list.appendChild(buildProjectCardPreview(project)));
}

function renderCertifications(certs) {
  const list = document.getElementById('certifications-list');
  if (!list) return;
  certs.forEach(cert => {
    const item = el('li', {}, [
      el('div', { className: 'cert-name', text: cert.name }),
      el('div', { className: 'cert-issuer', text: cert.issuer }),
      el('a', { className: 'cert-link', href: cert.link, target: '_blank', rel: 'noopener', text: 'View credential →' })
    ]);
    list.appendChild(item);
  });
}

function renderEducation(entries) {
  const list = document.getElementById('education-list');
  if (!list) return;
  entries.forEach(entry => {
    const children = [
      el('div', { className: 'edu-degree', text: entry.degree }),
      el('div', { className: 'edu-school', text: entry.school })
    ];
    if (entry.dates) children.push(el('div', { className: 'edu-dates', text: entry.dates }));
    list.appendChild(el('li', {}, children));
  });
}

function renderSkills(groups) {
  const container = document.getElementById('skills-groups');
  if (!container) return;
  groups.forEach(group => {
    const tags = el('div', { className: 'skill-tags' }, group.items.map(item => el('span', { className: 'skill-tag', text: item })));
    container.appendChild(el('div', { className: 'skill-group' }, [
      el('h4', { text: group.group }),
      tags
    ]));
  });
}

function renderContact(contact) {
  const container = document.getElementById('contact-content');
  if (container) {
    container.appendChild(el('div', { className: 'contact-item' }, [
      el('div', { className: 'contact-label', text: 'Location' }),
      el('div', { className: 'contact-value', text: contact.location })
    ]));
    container.appendChild(el('div', { className: 'contact-item' }, [
      el('div', { className: 'contact-label', text: 'Phone' }),
      el('div', { className: 'contact-value', text: contact.phone })
    ]));
    container.appendChild(el('div', { className: 'contact-item' }, [
      el('div', { className: 'contact-label', text: 'Email' }),
      el('a', { className: 'contact-value', href: `mailto:${contact.email}`, text: contact.email })
    ]));
    container.appendChild(el('div', { className: 'contact-item' }, [
      el('div', { className: 'contact-label', text: 'LinkedIn' }),
      el('a', { className: 'contact-value', href: contact.linkedin, target: '_blank', rel: 'noopener', text: 'linkedin.com/in/tyler-dunnic' })
    ]));
  }

  const linkedinLink = document.getElementById('linkedin-link');
  const resumeLink = document.getElementById('resume-link');
  if (linkedinLink) linkedinLink.href = contact.linkedin;
  if (resumeLink) resumeLink.href = contact.resume;
}

async function init() {
  const footerYear = document.getElementById('footer-year');
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  const [about, experience, projects, certifications, education, skills, contact] = await Promise.all([
    loadJSON('data/about.json'),
    loadJSON('data/experience.json'),
    loadJSON('data/projects.json'),
    loadJSON('data/certifications.json'),
    loadJSON('data/education.json'),
    loadJSON('data/skills.json'),
    loadJSON('data/contact.json')
  ]);

  renderAbout(about);
  renderExperience(experience);
  renderProjectsPreview(projects);
  renderProjectsFull(projects);
  renderCertifications(certifications);
  renderEducation(education);
  renderSkills(skills);
  renderContact(contact);

  // The browser's native hash-scroll fires before these cards exist (they're
  // rendered async above), so it silently no-ops. Do it manually once rendered.
  if (window.location.hash) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

init().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin',
    '<p style="background:#c0392b;color:#fff;padding:12px;text-align:center;">Failed to load site content — check the browser console.</p>');
});
