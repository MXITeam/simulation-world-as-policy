const loop = document.querySelector('[data-loop]');
const play = loop.querySelector('[data-play]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const zh = document.documentElement.lang === 'zh-CN';
const svg = loop.querySelector('svg');
const phases = zh
  ? ['01 / 编辑资产尺寸与位姿', '02 / 在子世界中尝试候选轨迹', '03 / 验证交互并选择轨迹', '04 / 抓取、搬运与释放']
  : ['01 / Edit asset dimensions and pose', '02 / Test trajectories in parallel worlds', '03 / Validate and select a trajectory', '04 / Grasp, transport and release'];
const phaseButtons = [...loop.querySelectorAll('[data-phase-select]')];
const phaseLabel = loop.querySelector('.diagram-phase');
const mesh = svg.querySelector('.mesh-object');
const handles = svg.querySelector('.edit-handles');
const scaleKnob = svg.querySelector('.scale-knob');
const poseKnob = svg.querySelector('.asset-controls circle[cy="258"]');
const parcel = svg.querySelector('.moving-parcel');
const executionScene = svg.querySelector('.execution > g');
const svgNamespace = 'http://www.w3.org/2000/svg';

// One rig and fixed segment lengths are used in the observation and execution views.
const rig = { baseX: 53, baseY: 75, upper: 90, forearm: 85, toolLength: 10 };
function createSvgElement(tag, attributes) {
  const element = document.createElementNS(svgNamespace, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}
function createArm(parent) {
  const group = createSvgElement('g', {
    class: 'articulated-arm', fill: 'none', stroke: '#a9b9cd',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  });
  parent.append(group);
  const shells = [48, 48, 46, 46, rig.toolLength].map(length => {
    const shell = createSvgElement('g', {});
    shell.append(createSvgElement('rect', {
      x: 3, y: -4, width: length - 6, height: 8, rx: 3,
      fill: '#61758f', stroke: '#c4d3e6', 'stroke-width': 0.8
    }));
    shell.append(createSvgElement('rect', {
      x: 4, y: -2, width: Math.max(2, length - 8), height: 4, rx: 2,
      fill: '#172333', stroke: '#8297b3', 'stroke-width': 0.6
    }));
    shell.append(createSvgElement('path', {
      d: `M4 -6 H${length - 4}`, stroke: '#8aa1be', 'stroke-width': 1.2
    }));
    group.append(shell);
    return shell;
  });
  const links = createSvgElement('path', { stroke: '#d3e1f3', 'stroke-width': 1, opacity: 0.3 });
  group.append(links);
  const joints = [0, 1, 2, 3, 4, 5].map((index) => {
    const joint = createSvgElement('g', {});
    joint.append(createSvgElement('circle', { r: index >= 4 ? 4 : 6, fill: '#192535', stroke: '#bccce0', 'stroke-width': 1.2 }));
    joint.append(createSvgElement('circle', { r: index >= 4 ? 2 : 3.5, fill: '#60768f', stroke: '#90a6c1', 'stroke-width': 0.7 }));
    joint.append(createSvgElement('circle', { r: 1.5, fill: '#d7e6f9', stroke: 'none' }));
    [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([cx, cy]) => {
      joint.append(createSvgElement('circle', { cx, cy, r: 0.7, fill: '#d8e4f4', stroke: 'none' }));
    });
    group.append(joint);
    return joint;
  });
  const wrist = createSvgElement('rect', { width: 9, height: 10, rx: 2, fill: '#485e78', stroke: '#bfd0e7', 'stroke-width': 0.8 });
  group.append(wrist);
  const gripper = createSvgElement('path', { stroke: '#d1def0', 'stroke-width': 2.8 });
  group.append(gripper);
  const pads = createSvgElement('path', { stroke: '#91abc9', 'stroke-width': 3.5 });
  group.append(pads);
  return { group, links, shells, joints, wrist, gripper, pads };
}

function positionArm(arm, gripX, gripY, opening) {
  const wristX = gripX;
  const wristY = gripY - rig.toolLength;
  const dx = wristX - rig.baseX;
  const dy = wristY - rig.baseY;
  const distance = Math.hypot(dx, dy);
  const along = (rig.upper ** 2 - rig.forearm ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, rig.upper ** 2 - along ** 2));
  const elbowX = rig.baseX + (along * dx + height * dy) / distance;
  const elbowY = rig.baseY + (along * dy - height * dx) / distance;
  // Split each effective link into two fixed-length articulated links.
  function intermediate(a, b, length, side) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    const h = Math.sqrt(Math.max(0, length * length - d * d / 4));
    return [(a[0] + b[0]) / 2 - side * dy / d * h, (a[1] + b[1]) / 2 + side * dx / d * h];
  }
  const base = [rig.baseX, rig.baseY], elbow = [elbowX, elbowY], wrist = [wristX, wristY];
  const points = [base, intermediate(base, elbow, 48, -1), elbow, intermediate(elbow, wrist, 46, 1), wrist, [gripX, gripY]];
  arm.links.setAttribute('d', 'M' + points.map(p => p.join(' ')).join(' L'));
  points.forEach(([x, y], index) => {
    arm.joints[index].setAttribute('transform', `translate(${x} ${y})`);
  });
  arm.shells.forEach((shell, index) => {
    const [x, y] = points[index];
    const [nextX, nextY] = points[index + 1];
    const angle = Math.atan2(nextY - y, nextX - x) * 180 / Math.PI;
    shell.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
  });
  arm.wrist.setAttribute('x', wristX - 4.5);
  arm.wrist.setAttribute('y', wristY + 2);
  arm.gripper.setAttribute('d',
    `M${wristX} ${wristY}v${rig.toolLength - 3} M${gripX - opening} ${gripY + 9}v-12h${2 * opening}v12`);
  arm.pads.setAttribute('d', `M${gripX - opening + 1} ${gripY + 5}v6 M${gripX + opening - 1} ${gripY + 5}v6`);

}
const workspace = svg.querySelector('#workspace');
[...workspace.children].forEach(element => {
  if (element.tagName === 'circle' || ['9', '2'].includes(element.getAttribute('stroke-width'))) {
    element.remove();
  }
});
const executionWorkspace = workspace.cloneNode(true);
executionWorkspace.id = 'execution-workspace';
svg.querySelector('defs').append(executionWorkspace);
executionScene.querySelector('use[href="#workspace"]').setAttribute('href', '#execution-workspace');
const referenceArm = createArm(workspace);
const executionArm = createArm(executionScene);
positionArm(referenceArm, 107, 35, 15);

function ease(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
function renderMotion(milliseconds) {
  const phase = Math.floor(milliseconds / 3000);
  const u = (milliseconds % 3000) / 3000;
  loop.dataset.phase = phase;
  phaseButtons.forEach((button, index) => {
    if (index === phase) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  phaseLabel.textContent = phases[phase];

  const sizeWave = phase === 0 ? Math.sin(Math.PI * Math.min(1, u / 0.52)) : 0;
  const poseWave = phase === 0 ? Math.sin(Math.PI * Math.max(0, Math.min(1, (u - 0.52) / 0.48))) : 0;
  const transform = `translate(326 245) rotate(${12 * poseWave}) scale(${1 + 0.25 * sizeWave} ${1 - 0.25 * sizeWave}) translate(-326 -245)`;
  mesh.setAttribute('transform', transform);
  handles.setAttribute('transform', transform);
  scaleKnob.setAttribute('transform', `translate(${22 * sizeWave} 0)`);
  poseKnob.setAttribute('transform', `translate(${14 * poseWave} 0)`);

  let x = 108, y = 65, gripX = 107, gripY = 35, opening = 15;
  if (phase === 3) {
    const travel = ease((u - 0.18) / 0.52);
    x += 74 * travel;
    y += 37 * travel - 68 * Math.sin(Math.PI * travel);
    if (u < 0.18) {
      const approach = ease(u / 0.18);
      gripX += 14 * approach;
      gripY += 28 * approach;
      opening -= 7 * approach;
    } else if (u < 0.73) {
      gripX = x + 13;
      gripY = y - 2;
      opening = 8;
    } else {
      const release = ease((u - 0.73) / 0.1);
      const retreat = ease((u - 0.82) / 0.18);
      y += 9 * release;
      gripX = (x + 13) * (1 - retreat) + 107 * retreat;
      gripY = (y - 2 - 9 * release) * (1 - retreat) + 35 * retreat;
      opening = 8 + 7 * release;
    }
  }
  parcel.setAttribute('transform', `translate(${x} ${y}) scale(.65)`);
  positionArm(executionArm, gripX, gripY, opening);
}
let paused = reduced.matches;
let visible = true;
let elapsed = reduced.matches ? 6000 : 0;
let previousTime;
function setPaused(value) {
  paused = value;
  loop.classList.toggle('paused', paused);
  play.setAttribute('aria-pressed', String(paused));
  play.textContent = zh ? (paused ? '播放动画' : '暂停动画') : (paused ? 'Play animation' : 'Pause animation');
}
play.addEventListener('click', () => setPaused(!paused));
phaseButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    elapsed = index * 3000;
    renderMotion(elapsed);
    setPaused(reduced.matches);
  });
});
reduced.addEventListener('change', event => {
  setPaused(event.matches);
  if (event.matches) {
    elapsed = 6000;
    renderMotion(elapsed);
  }
});
new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  loop.classList.toggle('offscreen', !visible);
}).observe(loop);
function animate(time) {
  if (previousTime !== undefined && !paused && visible && !document.hidden) {
    elapsed = (elapsed + Math.min(time - previousTime, 100)) % 12000;
    renderMotion(elapsed);
  }
  previousTime = time;
  requestAnimationFrame(animate);
}
setPaused(paused);
renderMotion(elapsed);
requestAnimationFrame(animate);
const tabs = [...document.querySelectorAll('[data-scene]')];
function selectScene(index, focus = false) {
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = i !== index;
  });
  if (focus) tabs[index].focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectScene(i));
  tab.addEventListener('keydown', event => {
    const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); selectScene(next, true); }
  });
});
const compact = matchMedia('(max-width: 700px)');
function layoutDiagram() {
 const svg=loop.querySelector('svg');
 svg.setAttribute('viewBox',compact.matches?'0 65 630 830':'0 0 1200 560');
 svg.querySelector('.search').setAttribute('transform',compact.matches?'translate(-525 390)':'translate(0 0)');
 svg.querySelector('.execution').setAttribute('transform',compact.matches?'translate(-540 390)':'translate(0 0)');
 svg.querySelector('.feedback-path').setAttribute('d',compact.matches?'M463 828v45H17V245h10':'M1003 438v65H366v-25');
}
compact.addEventListener('change',layoutDiagram);layoutDiagram();

// Keep independently controlled experiment videos from playing over one another.
const experimentVideos = [...document.querySelectorAll('.video-demo video')];
experimentVideos.forEach(video => video.addEventListener('play', () => {
  experimentVideos.forEach(other => { if (other !== video) other.pause(); });
}));

const assetChoice = document.getElementById('asset-choice');
const assetNames = { airplane: zh ? 'RoboColiseum 飞机' : 'RoboColiseum airplane', block: zh ? '积木' : 'Block', can: zh ? '罐子' : 'Can', bowl: zh ? '碗' : 'Bowl' };
assetChoice.addEventListener('change', () => {
  const name = assetNames[assetChoice.value];
  svg.querySelector('#parcel use').setAttribute('href', '#asset-' + assetChoice.value);
  svg.querySelector('.asset-name').textContent = (zh ? '资产 / ' : 'ASSET / ') + name;
  loop.querySelector('.asset-caption').textContent = name + (zh ? ' · 方法示意' : ' · Method schematic');
  loop.querySelector('.asset-selection-status').textContent = zh ? '已同步到所有环节' : 'Updated throughout the diagram';
  svg.querySelector('#system-desc').textContent = zh ? `${name}的观测、资产编辑、候选试验与执行示意。` : `Observation, asset editing, candidate trials and execution with ${name}.`;
  elapsed = 0; renderMotion(elapsed);
});
