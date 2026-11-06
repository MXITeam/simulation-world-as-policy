const loop = document.querySelector('[data-loop]');
let evolutionRound = 1;
const play = loop.querySelector('[data-play]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const zh = document.documentElement.lang === 'zh-CN';
const svg = loop.querySelector('svg');
const phases = zh
  ? ['01 / 从 RGB-D 仅重建任务相关内容', '02 / 大量仿真副本同时尝试不同动作', '03 / 筛选成功动作，沉淀 skill', '04 / 放大选中场景，过渡到执行', '05 / 单臂执行回放，反馈推动进化']
  : ['01 / Reconstruct task-relevant geometry from RGB-D', '02 / Test different actions in parallel twin copies', '03 / Select successes and distill skills', '04 / Enlarge the selected scene and transfer to execution', '05 / Replay single-arm execution and retain feedback'];
const phaseButtons = [...loop.querySelectorAll('[data-phase-select]')];
const phaseLabel = loop.querySelector('.diagram-phase');
const parcel = svg.querySelector('.moving-parcel');
const executionScene = svg.querySelector('.execution > g');
const svgNamespace = 'http://www.w3.org/2000/svg';

// One rig and fixed segment lengths are used in the observation and execution views.
const rig = { baseX: 53, baseY: 82, upper: 74, forearm: 74, toolLength: 10, elbowSide: 1, displayScale: 1, offsetX: 0, offsetY: 0 };
function createSvgElement(tag, attributes) {
  const element = document.createElementNS(svgNamespace, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}
function createArm(parent, configuration = {}) {
  const dimensions = { ...rig, ...configuration };
  const group = createSvgElement('g', {
    class: 'articulated-arm', transform: `translate(${dimensions.offsetX} ${dimensions.offsetY}) scale(${dimensions.displayScale})`, fill: 'none', stroke: '#a9b9cd',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  });
  parent.append(group);
  const assetBase = new URL('media/experiment-assets/robot/', document.querySelector('script[src*="app.js"]').src);
  const sourceLinks = [3, 4, 5, 6, 7];
  const shells = [dimensions.upper / 2 + 1, dimensions.upper / 2 + 1, dimensions.forearm / 2 + 1, dimensions.forearm / 2 + 1, dimensions.toolLength].map((length, index) => {
    const shell = createSvgElement('g', {});
    const height = index < 3 ? 22 : index === 3 ? 16 : 11;
    shell.append(createSvgElement('image', {
      href: new URL(`link-${sourceLinks[index]}.png`, assetBase).href,
      x: -2, y: -height / 2, width: length + 4, height,
      preserveAspectRatio: 'none', class: 'robot-cad-link'
    }));
    group.append(shell);
    return shell;
  });
  const links = createSvgElement('path', { stroke: '#d3e1f3', 'stroke-width': 1, opacity: 0 });
  group.append(links);
  const joints = [0, 1, 2, 3, 4, 5].map((index) => {
    const joint = createSvgElement('g', {});
    joint.append(createSvgElement('circle', { r: index >= 4 ? 4 : 6, fill: 'url(#robot-joint-dark)', stroke: '#a1a8ae', 'stroke-width': 1 }));
    joint.append(createSvgElement('circle', { r: index >= 4 ? 2 : 3.5, fill: 'url(#robot-joint-metal)', stroke: '#d9dee1', 'stroke-width': 0.7 }));
    joint.append(createSvgElement('circle', { r: 1.5, fill: '#d7e6f9', stroke: 'none' }));
    [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([cx, cy]) => {
      joint.append(createSvgElement('circle', { cx, cy, r: 0.7, fill: '#d8e4f4', stroke: 'none' }));
    });
    group.append(joint);
    return joint;
  });
  const wrist = createSvgElement('rect', { width: 9, height: 10, rx: 2, fill: 'url(#robot-joint-metal)', stroke: '#b8bec5', 'stroke-width': 0.8 });
  group.append(wrist);
  const gripper = createSvgElement('path', { stroke: '#d1def0', 'stroke-width': 2.8 });
  group.append(gripper);
  const pads = createSvgElement('path', { stroke: '#91abc9', 'stroke-width': 3.5 });
  group.append(pads);
  return { group, links, shells, joints, wrist, gripper, pads, dimensions };
}

function createArmBase(parent) {
  parent.append(createSvgElement('ellipse', {
    cx: 53, cy: 83, rx: 13, ry: 6, fill: 'url(#robot-joint-dark)', stroke: '#929ca3', 'stroke-width': 1
  }));
}

function positionArm(arm, gripX, gripY, opening) {
  const dimensions = arm.dimensions;
  gripX = (gripX - dimensions.offsetX) / dimensions.displayScale;
  gripY = (gripY - dimensions.offsetY) / dimensions.displayScale;
  const wristTilt = 0;
  const wristX = gripX - Math.sin(wristTilt) * dimensions.toolLength;
  const wristY = gripY - Math.cos(wristTilt) * dimensions.toolLength;
  const dx = wristX - dimensions.baseX;
  const dy = wristY - dimensions.baseY;
  const distance = Math.hypot(dx, dy);
  const along = (dimensions.upper ** 2 - dimensions.forearm ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, dimensions.upper ** 2 - along ** 2));
  const elbowX = dimensions.baseX + (along * dx + dimensions.elbowSide * height * dy) / distance;
  const elbowY = dimensions.baseY + (along * dy - dimensions.elbowSide * height * dx) / distance;
  // Split each effective link into two fixed-length articulated links.
  function intermediate(a, b, length, side) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    const h = Math.sqrt(Math.max(0, length * length - d * d / 4));
    return [(a[0] + b[0]) / 2 - side * dy / d * h, (a[1] + b[1]) / 2 + side * dx / d * h];
  }
  const base = [dimensions.baseX, dimensions.baseY], elbow = [elbowX, elbowY], wrist = [wristX, wristY];
  const points = [base, intermediate(base, elbow, dimensions.upper / 2 + 1, -dimensions.elbowSide), elbow, intermediate(elbow, wrist, dimensions.forearm / 2 + 1, dimensions.elbowSide), wrist, [gripX, gripY]];
  arm.links.setAttribute('d', 'M' + points.map(p => p.join(' ')).join(' L'));
  points.forEach(([x, y], index) => {
    arm.joints[index].setAttribute('transform', `translate(${x} ${y})`);
  });
  arm.shells.forEach((shell, index) => {
    const [x, y] = points[index];
    const endIndex = index + 1;
    const [nextX, nextY] = points[endIndex];
    shell.querySelector('image').setAttribute('width', Math.hypot(nextX - x, nextY - y) + 4);
    const angle = Math.atan2(nextY - y, nextX - x) * 180 / Math.PI;
    shell.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
  });
  const toolTransform = `translate(${gripX} ${gripY}) rotate(${-wristTilt * 180 / Math.PI})`;
  arm.wrist.setAttribute('x', -4.5);
  arm.wrist.setAttribute('y', -dimensions.toolLength + 2);
  arm.wrist.setAttribute('transform', toolTransform);
  arm.gripper.setAttribute('d',
    `M0 ${-dimensions.toolLength}v${dimensions.toolLength - 3} M${-opening} 9v-12h${2 * opening}v12`);
  arm.gripper.setAttribute('transform', toolTransform);
  arm.pads.setAttribute('d', `M${-opening + 1} 5v6 M${opening - 1} 5v6`);
  arm.pads.setAttribute('transform', toolTransform);

}
const workspace = svg.querySelector('#workspace');
[...workspace.children].forEach(element => {
  if (element.tagName === 'circle' || ['9', '2'].includes(element.getAttribute('stroke-width'))) {
    element.remove();
  }
});
workspace.querySelectorAll('ellipse').forEach(ellipse => ellipse.remove());
createArmBase(workspace);
const executionWorkspace = workspace.cloneNode(true);
executionWorkspace.id = 'execution-workspace';
svg.querySelector('defs').append(executionWorkspace);
executionScene.querySelector('use[href="#workspace"]').setAttribute('href', '#execution-workspace');
const referenceArm = createArm(workspace);
const executionArm = createArm(executionScene);
positionArm(referenceArm, 107, 35, 15);

// The twin keeps collision geometry minimal while displaying the actual CAD casings.
const twinDefinition = svg.querySelector('#minimal-twin');
[...twinDefinition.children].forEach(element => {
  if (element.tagName === 'circle' || element.getAttribute('stroke-width') === '5' ||
      element.getAttribute('d') === 'm108 40 9 5v13m0-13 9-3 7 7') element.remove();
});
createArmBase(twinDefinition);
const twinArm = createArm(twinDefinition);
positionArm(twinArm, 113, 43, 13);

// Give each rollout its own scene nodes; a shared <use> cannot animate independently.
const trialWorlds = [...svg.querySelectorAll('.trial-world')].map((cell, index) => {
  const viewport = cell.querySelector('g');
  const scene = svg.querySelector('#minimal-twin').cloneNode(true);
  scene.removeAttribute('id');
  // Replace the static arm with a small articulated rig for this rollout.
  [...scene.children].forEach(element => {
    if (element.tagName === 'circle' || element.getAttribute('stroke-width') === '5' ||
        element.getAttribute('d') === 'm108 40 9 5v13m0-13 9-3 7 7') element.remove();
  });
  viewport.querySelector('use').replaceWith(scene);
  const object = scene.querySelector('use[href="#parcel"]');
  scene.querySelectorAll('.articulated-arm').forEach(arm => arm.remove());
  const trialRig = createArm(scene);
  const arm = trialRig.links;
  const gripper = trialRig.gripper;
  const verdict = createSvgElement('path', {
    class: 'rollout-verdict', fill: 'none', 'stroke-width': 1.3,
    d: cell.classList.contains('winner') ? 'M46 5l2 2 4-5' : 'M48 3l4 4m0-4-4 4'
  });
  cell.append(verdict);
  const trail = viewport.querySelector('.trial-path');
  trail.setAttribute('d', 'M121 65Q150 8 195 115');
  return { cell, object, arm, gripper, rig: trialRig, trail, verdict, index,
    success: cell.classList.contains('winner') };
});

function renderTrials(milliseconds, phase) {
  trialWorlds.forEach(trial => {
    // All worlds run together, with different speeds, lift heights and failure points.
    const duration = (evolutionRound > 1 ? 1150 : 2100) + (trial.index % 7) * 100;
    const progress = phase === 0 ? 0 : phase >= 2 ? 0.96 : trial.success ? Math.min(.96, (milliseconds - 3000) / (evolutionRound > 1 ? 1000 : 2700)) :
      ((milliseconds - 3000 + (trial.index % 11) * 65) % duration) / duration;
    const transport = ease((progress - 0.16) / 0.58);
    const failure = trial.index % 2 === 0 ? 'collision' : 'slip';
    const hit = !trial.success && failure === 'collision';
    const travel = hit ? Math.min(transport, 0.5) : transport;
    const lift = 28 + (trial.index % 4) * 4;
    let x = 108 + 74 * travel;
    let y = 65 + 37 * travel - lift * Math.sin(Math.PI * travel);
    let rotation = 0;
    const failed = !trial.success && progress > 0.57;
    if (failed && failure === 'slip') {
      y += 32 * ease((progress - 0.57) / 0.2);
      rotation = 65 * ease((progress - 0.57) / 0.2);
    }
    if (trial.success && progress > 0.78) y += 7 * ease((progress - 0.78) / 0.1);
    const approach = ease(progress / 0.16);
    const gripX = progress < 0.16 ? 113 + 8 * approach : 121 + 74 * travel;
    const gripY = progress < 0.16 ? 43 + 20 * approach :
      63 + 37 * travel - lift * Math.sin(Math.PI * travel);
    const opening = progress < 0.16 ? 13 - 7 * approach :
      (failed && failure === 'slip') || progress > 0.82 ? 12 : 6;
    trial.object.setAttribute('transform',
      `translate(${x} ${y}) rotate(${rotation} 13 8) scale(.85)`);
    positionArm(trial.rig, gripX, gripY, opening);
    trial.trail.setAttribute('d',
      `M121 65Q${145 + trial.index % 4 * 8} ${-lift + 45} ${hit ? 158 : 195} ${hit ? 66 : 115}`);
    trial.cell.dataset.outcome = progress > 0.8 ? (trial.success ? 'success' : failure) : 'running';
    trial.verdict.style.opacity = progress > 0.8 ? '1' : '0';
  });
}

const reconstructionCloud = svg.querySelector('.reconstruction-cloud');
const contextPoints = reconstructionCloud.querySelectorAll('.context-point');
const reconstructionTwin = svg.querySelector('.twin-rebuild');
const reconstructedGeometry = svg.querySelector('#minimal-twin').cloneNode(true);
reconstructedGeometry.removeAttribute('id');
reconstructionTwin.querySelector('use').replaceWith(reconstructedGeometry);
const reconstructionEdges = [...reconstructedGeometry.querySelectorAll('path')].map(path => ({
  path, length: path.getTotalLength()
}));
const reconstructedObject = reconstructedGeometry.querySelector('use');
const reconstructionStatus = svg.querySelector('.reconstruction-status');
const discardedContext = svg.querySelector('.irrelevant-detail');
function renderReconstruction(phase, progress) {
  const building = phase === 0;
  const scan = ease(progress / 0.28);
  const filter = ease((progress - 0.22) / 0.28);
  const geometry = building ? ease((progress - 0.43) / 0.44) : 1;
  reconstructionCloud.style.opacity = building ? String(scan * (1 - ease((progress - 0.72) / 0.25))) : '0';
  contextPoints.forEach(point => { point.style.opacity = String(1 - filter); });
  discardedContext.style.opacity = building ? String(0.35 * (1 - filter)) : '0.04';
  reconstructionTwin.style.opacity = building ? String(0.08 + 0.92 * geometry) : '1';
  reconstructionEdges.forEach(({path, length}) => {
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length * (1 - geometry));
  });
  reconstructedObject.style.opacity = building ? String(ease((progress - 0.65) / 0.3)) : '1';
  const stage = !building || progress > 0.78 ? 3 : progress > 0.48 ? 2 : progress > 0.25 ? 1 : 0;
  reconstructionStatus.textContent = (zh
    ? ['深度采样与投影', '筛掉与任务无关的点', '生成任务相关碰撞几何', '最小仿真孪生就绪']
    : ['Sample and project depth', 'Discard task-irrelevant points', 'Build task-relevant collision geometry', 'Minimal simulation twin ready'])[stage];
}

const evolutionLoop = svg.querySelector('.evolution-loop');
const evolutionRoundLabel = svg.querySelector('.evolution-round');
const libraryStatus = svg.querySelector('.library-status');
const skillMemory = svg.querySelector('.skill-memory');
const assetMemory = svg.querySelector('.asset-memory');
const memoryTrajectory = svg.querySelector('.skill-trajectory');
const memoryTrajectoryLength = memoryTrajectory.getTotalLength();
const distillPacket = createSvgElement('circle', { r: 3, fill: '#ccddb6', opacity: 0 });
evolutionLoop.append(distillPacket);
function renderEvolution(phase, progress) {
  const reusing = evolutionRound > 1 && phase < 2;
  evolutionLoop.dataset.reusing = String(reusing);
  evolutionRoundLabel.textContent = zh
    ? `第 ${String(evolutionRound).padStart(2, '0')} 轮 / ${reusing ? '复用经验' : '积累经验'}（示意）`
    : `ROUND ${String(evolutionRound).padStart(2, '0')} / ${reusing ? 'REUSE' : 'COLLECT'} (schematic)`;
  const learned = phase >= 2 ? ease((progress + (phase >= 3 ? 1 : 0)) / .65) : evolutionRound > 1 ? 1 : .12;
  skillMemory.style.opacity = String(.3 + learned * .7);
  assetMemory.style.opacity = String(phase === 0 ? .45 + .55 * progress : 1);
  memoryTrajectory.style.strokeDasharray = String(memoryTrajectoryLength);
  memoryTrajectory.style.strokeDashoffset = String(memoryTrajectoryLength * (1 - learned));
  distillPacket.setAttribute('cx', '837');
  distillPacket.setAttribute('cy', String(416 + 62 * ease(progress)));
  distillPacket.style.opacity = phase === 2 && progress < .95 ? '1' : '0';
  libraryStatus.textContent = (zh
    ? [reusing ? '复用已有资产与 skill' : '记录重建资产与物理参数', reusing ? '已有 skill 引导新一轮试错' : '收集抓取点与候选轨迹', '将成功抓取与轨迹总结为 skill', '选中场景放大，准备执行回放', '执行反馈入库，供下一轮复用']
    : [reusing ? 'Reuse assets and skills' : 'Store geometry and physics', reusing ? 'Skills seed the next search' : 'Collect grasps and trajectories', 'Distill verified trials into skills', 'Enlarge the selected scene for replay', 'Retain execution feedback for reuse'])[phase];
}

const selectedFocus = createSvgElement('g', { class: 'selected-focus', opacity: 0 });
const selectedFocusScene = createSvgElement('g', {});
const selectedFocusLabel = createSvgElement('text', {
  x: 690, y: 92, class: 'selected-focus-label'
});
selectedFocusLabel.textContent = zh ? '选中成功场景 → 放大查看 → 执行回放' : 'Selected success → enlarged scene → execution replay';
selectedFocus.append(selectedFocusScene, selectedFocusLabel);
svg.insertBefore(selectedFocus, evolutionLoop);
let focusRound = 0;
function renderSelectionZoom(phase, progress) {
  const searching = svg.querySelector('.search');
  const execution = svg.querySelector('.execution');
  if (phase !== 3) {
    selectedFocus.style.opacity = '0';
    searching.style.opacity = '1';
    execution.style.opacity = phase === 2 ? '.35' : '1';
    return;
  }
  if (focusRound !== evolutionRound) {
    const snapshot = trialWorlds.find(trial => trial.success).cell.cloneNode(true);
    snapshot.removeAttribute('transform');
    snapshot.classList.remove('trial-world');
    snapshot.classList.add('selected-world');
    selectedFocusScene.replaceChildren(snapshot);
    focusRound = evolutionRound;
  }
  const enlarge = ease(progress / .43);
  const transfer = ease((progress - .7) / .3);
  const interpolate = (a, b, t) => a + (b - a) * t;
  const winner = trialWorlds.find(trial => trial.success).cell;
  const origin = winner.getAttribute('transform').match(/[-+]?[0-9.]+/g).map(Number);
  const sceneScale = Number(winner.dataset.sceneScale);
  const x = interpolate(interpolate(origin[0], 690, enlarge), 1110, transfer);
  const y = interpolate(interpolate(origin[1], 110, enlarge), 143, transfer);
  const scale = interpolate(interpolate(1, 5, enlarge), 1.05 / sceneScale, transfer);
  selectedFocusScene.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
  selectedFocus.style.opacity = String(1 - ease((progress - .92) / .08));
  selectedFocusLabel.style.opacity = String(enlarge * (1 - transfer));
  searching.style.opacity = String(1 - .88 * enlarge);
  execution.style.opacity = String(transfer);
}

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
  renderTrials(milliseconds, phase);
  renderReconstruction(phase, u);
  renderEvolution(phase, u);
  renderSelectionZoom(phase, u);

  let x = 108, y = 65, gripX = 107, gripY = 35, opening = 15;
  if (phase === 4) {
    const travel = ease((u - 0.18) / 0.52);
    x += 74 * travel;
    y += 37 * travel - 48 * Math.sin(Math.PI * travel);
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
    const nextElapsed = elapsed + Math.min(time - previousTime, 100);
    if (nextElapsed >= 15000) evolutionRound += 1;
    elapsed = nextElapsed % 15000;
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
// Keep independently controlled experiment videos from playing over one another.
const experimentVideos = [...document.querySelectorAll('.video-demo video')];
experimentVideos.forEach(video => video.addEventListener('play', () => {
  experimentVideos.forEach(other => { if (other !== video) other.pause(); });
}));
