"use strict";
const descriptions = {
  estimator: ["Estimator", "Combines sensor readings to estimate orientation and motion. The controller uses that estimate to decide how to respond."],
  controller: ["Controller", "Compares the estimated orientation and motion with the command, then calculates a corrective response."],
  allocation: ["Allocation", "Divides the requested response among the motors, within what the actuators can deliver."],
  motors: ["Motors", "Turn motor commands into physical motion. Sensors measure the response and feed it back to the estimator."]
};
const stageButtons = document.querySelectorAll("[data-stage]");
const description = document.getElementById("stage-description");
// Stack descriptions in one grid cell so switching stages never changes its height.
// Hidden copies reserve space but are excluded from the accessibility tree.
const stageCopy = document.createElement("div");
stageCopy.className = "stage-copy";
const stageParagraphs = {};
Object.entries(descriptions).forEach(([key, [, body]]) => {
  const paragraph = document.createElement("p");
  paragraph.textContent = body;
  paragraph.hidden = key !== "estimator";
  stageParagraphs[key] = paragraph;
  stageCopy.append(paragraph);
});
description.querySelector("p").replaceWith(stageCopy);
stageButtons.forEach(button => button.addEventListener("click", () => {
  stageButtons.forEach(stage => {
    const selected = stage === button;
    stage.classList.toggle("active", selected);
    stage.setAttribute("aria-pressed", String(selected));
  });
  const [title] = descriptions[button.dataset.stage];
  description.querySelector("h3").textContent = title;
  Object.entries(stageParagraphs).forEach(([key, paragraph]) => {
    paragraph.hidden = key !== button.dataset.stage;
  });
}));

const indexLinks = [...document.querySelectorAll(".index-links a")];
const indexedSections = indexLinks.map(link => document.getElementById(link.hash.slice(1)));
function updateCurrentSection() {
  // Matches the anchor offset: the compact index needs more space above headings.
  const offset = window.matchMedia("(max-width: 1639px)").matches ? 155 : 30;
  let current = null;
  indexedSections.forEach(section => {
    if (section.getBoundingClientRect().top <= offset) current = section.id;
  });
  indexLinks.forEach(link => {
    if (link.hash === `#${current}`) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
let scrollQueued = false;
function queueIndexUpdate() {
  if (scrollQueued) return;
  scrollQueued = true;
  window.requestAnimationFrame(() => {
    scrollQueued = false;
    updateCurrentSection();
  });
}
window.addEventListener("scroll", queueIndexUpdate, { passive: true });
window.addEventListener("resize", queueIndexUpdate);
window.addEventListener("hashchange", queueIndexUpdate);
window.addEventListener("load", queueIndexUpdate);
updateCurrentSection();

// Only the background highlight reveals; heading text is always fully readable.
const headings = [...document.querySelectorAll(".section-heading h2")].map(heading => {
  const highlight = document.createElement("span");
  highlight.className = "heading-highlight";
  highlight.textContent = heading.textContent;
  heading.replaceChildren(highlight);
  return highlight;
});
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  headings.forEach(heading => observer.observe(heading));
} else {
  headings.forEach(heading => heading.classList.add("is-revealed"));
}

// Recordings always start manually; only one may play at a time.
const recordings = [...document.querySelectorAll('.orbes-recordings video')];
recordings.forEach(video => video.addEventListener('play', () => {
  recordings.forEach(other => { if (other !== video) other.pause(); });
}));
if ('IntersectionObserver' in window) {
  const recordingObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) entry.target.pause();
  }));
  recordings.forEach(video => recordingObserver.observe(video));
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) recordings.forEach(video => video.pause());
});
