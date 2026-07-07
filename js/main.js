async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text) node.textContent = opts.text;
  if (opts.html) node.innerHTML = opts.html;
  if (opts.href) node.href = opts.href;
  if (opts.target) node.target = opts.target;
  if (opts.rel) node.rel = opts.rel;
  if (opts.src) node.src = opts.src;
  if (opts.alt) node.alt = opts.alt;
  children.forEach(c => c && node.appendChild(c));
  return node;
}

function renderAbout(about) {
  document.getElementById('hero-tagline').textContent = about.tagline;

  const container = document.getElementById('about-content');
  about.bio.forEach(paragraph => {
    container.appendChild(el('p', { text: paragraph }));
  });
}

function renderExperience(jobs) {
  const list = document.getElementById('experience-list');
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

function renderProjects(projects) {
  const list = document.getElementById('projects-list');
  projects.forEach(project => {
    const challenges = el('ul', {}, project.challenges.map(c => el('li', { text: c })));
    const outcomes = el('ul', {}, project.outcomes.map(o => el('li', { text: o })));
    const tags = el('div', { className: 'tag-row' }, project.tags.map(t => el('span', { className: 'tag', text: t })));

    const body = el('div', { className: 'project-card-body' }, [
      el('h3', { text: project.title }),
      el('p', { className: 'project-tagline', text: project.tagline }),
      el('h4', { text: 'Objective' }),
      el('p', { text: project.objective }),
      el('h4', { text: 'Challenges' }),
      challenges,
      el('h4', { text: 'Outcomes' }),
      outcomes,
      tags
    ]);

    const card = el('article', { className: 'project-card' });
    card.appendChild(body);

    if (project.images && project.images.length) {
      const gallery = el('div', { className: 'project-gallery' },
        project.images.map(img => el('img', { src: img.src, alt: img.alt, loading: 'lazy' }))
      );
      card.appendChild(gallery);
    }

    list.appendChild(card);
  });
}

function renderCertifications(certs) {
  const list = document.getElementById('certifications-list');
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
  container.appendChild(el('div', { className: 'contact-item' }, [
    el('div', { className: 'contact-label', text: 'Email' }),
    el('a', { className: 'contact-value', href: `mailto:${contact.email}`, text: contact.email })
  ]));
  container.appendChild(el('div', { className: 'contact-item' }, [
    el('div', { className: 'contact-label', text: 'Phone' }),
    el('div', { className: 'contact-value', text: contact.phone })
  ]));
  container.appendChild(el('div', { className: 'contact-item' }, [
    el('div', { className: 'contact-label', text: 'Location' }),
    el('div', { className: 'contact-value', text: contact.location })
  ]));
  container.appendChild(el('div', { className: 'contact-item' }, [
    el('div', { className: 'contact-label', text: 'LinkedIn' }),
    el('a', { className: 'contact-value', href: contact.linkedin, target: '_blank', rel: 'noopener', text: 'linkedin.com/in/tyler-dunnic' })
  ]));

  document.getElementById('linkedin-link').href = contact.linkedin;
  document.getElementById('resume-link').href = contact.resume;
}

async function init() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();

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
  renderProjects(projects);
  renderCertifications(certifications);
  renderEducation(education);
  renderSkills(skills);
  renderContact(contact);
}

init().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin',
    '<p style="background:#c0392b;color:#fff;padding:12px;text-align:center;">Failed to load site content — check the browser console.</p>');
});
