// Visualizador simple con 3 modos: 'd3', 'cytoscape', 'graphviz' (Viz.js)
export default class GraphVisualizer {
  constructor(containerId = 'canvas') {
    this.containerId = containerId;
    this.mode = 'd3';
    this.cy = null;
    this.viz = null; // Viz.js instance
    this.layout = 'auto';
  }

  setContainer(id){ this.containerId = id; }

  initialize(mode='d3'){
    this.mode = mode;
    this.clear();
    if (mode === 'graphviz'){
      if (window.Viz){
        // eslint-disable-next-line new-cap
        this.viz = new window.Viz({ workerURL: undefined });
      } else {
        console.warn('Viz.js no encontrado; agrega <script src="...viz.js"></script> y full.render.js');
      }
    }
  }

  applyLayout(layout='auto'){ this.layout = layout; }

  clear(){
    const el = document.getElementById(this.containerId);
    if (!el) return;
    el.innerHTML = '';
    if (this.cy){ try { this.cy.destroy(); } catch{} this.cy = null; }
  }

  async visualizeAutomaton(automaton){
    const el = document.getElementById(this.containerId);
    if (!el) return;
    this.clear();

    let j;
    try {
      j = JSON.parse(automaton.export('json'));
    } catch (e) {
      j = this._fromObject(automaton);
    }

    if (this.mode === 'graphviz') return this._renderGraphviz(el, j);
    if (this.mode === 'cytoscape') return this._renderCytoscape(el, j);
    return this._renderD3(el, j);
  }

  async exportAsImage(fmt='png'){
    if (this.mode === 'cytoscape' && this.cy){
      return this.cy.png({ full: true, scale: 2, bg: '#ffffff' });
    }
    const el = document.getElementById(this.containerId);
    const svg = el.querySelector('svg');
    if (!svg) throw new Error('No se encontró SVG para exportar.');

    const svgText = new XMLSerializer().serializeToString(svg);
    if (fmt === 'svg') {
      return new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    }

    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const canvas = document.createElement('canvas');

    const bbox = svg.getBBox ? svg.getBBox() : { width: svg.viewBox.baseVal.width || 1000, height: svg.viewBox.baseVal.height || 600 };
    const width = Math.max(1, Math.ceil(bbox.width || 1000));
    const height = Math.max(1, Math.ceil(bbox.height || 600));
    canvas.width = width * 2; canvas.height = height * 2;
    const ctx = canvas.getContext('2d');

    await new Promise((resolve, reject)=>{
      img.onload = () => { resolve(); };
      img.onerror = reject;
      img.src = url;
    });

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    return await new Promise((resolve)=>canvas.toBlob(resolve, 'image/png'));
  }

  _renderD3(container, j){
    const w = container.clientWidth || 900;
    const h = container.clientHeight || 560;
    const svg = d3.select(container).append('svg')
      .attr('width', w).attr('height', h)
      .style('background', '#ffffff');

    const nodes = (j.ESTADOS || []).map(id => ({ id, isAccept: (j.ACEPTACION||[]).includes(id), isStart: j.INICIO === id }));
    const links = (j.TRANSICIONES || []).map(t => ({ source: t.from, target: t.to, label: t.symbol }));

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.08))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(w/2, h/2));

    if (this.layout === 'grid') {
      const cols = Math.ceil(Math.sqrt(nodes.length||1));
      nodes.forEach((n,i)=>{ n.fx = (i%cols+1)* (w/(cols+1)); n.fy = (Math.floor(i/cols)+1)*(h/(cols+1)); });
    }

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id','arrow').attr('viewBox','0 -5 10 10')
      .attr('refX',18).attr('refY',0).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
      .append('path').attr('d','M0,-5L10,0L0,5').style('fill','#334');

    const link = svg.append('g').attr('stroke','#99a').attr('stroke-width',1.6).selectAll('path')
      .data(links).enter().append('path').attr('fill','none').attr('marker-end','url(#arrow)');

    const linkLabel = svg.append('g').selectAll('text')
      .data(links).enter().append('text')
      .attr('font-size',12).attr('fill','#223').text(d => d.label);

    const node = svg.append('g').selectAll('g')
      .data(nodes).enter().append('g').call(d3.drag()
        .on('start', (event,d)=>{ if(!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event,d)=>{ d.fx = event.x; d.fy = event.y; })
        .on('end', (event,d)=>{ if(!event.active) sim.alphaTarget(0); if (this.layout!=='grid'){ d.fx=null; d.fy=null; }})
      );

    node.append('circle')
      .attr('r', 16)
      .attr('fill', d => d.isStart ? '#e8f3ff' : '#f5f7ff')
      .attr('stroke', d => d.isAccept ? '#3a7' : '#345')
      .attr('stroke-width', d => d.isAccept ? 3 : 2);

    node.append('text')
      .attr('text-anchor','middle').attr('dy','.35em')
      .attr('font-size',13).attr('fill','#223')
      .text(d => d.id);

    const start = nodes.find(n=>n.isStart);
    if (start) {
      svg.append('path')
        .attr('d', `M ${20},${h-20} L ${40},${h-28} L ${40},${h-12} Z`)
        .attr('fill', '#345').attr('opacity',.9);
      svg.append('line')
        .attr('x1', 40).attr('y1', h-20).attr('x2', start.x||w/2).attr('y2', start.y||h/2)
        .attr('stroke', '#345').attr('stroke-width',1.5).attr('marker-end','url(#arrow)');
    }

    sim.on('tick', ()=>{
      link.attr('d', d => {
        const dx = (d.target.x - d.source.x);
        const dy = (d.target.y - d.source.y);
        const dr = (d.source.id === d.target.id) ? 40 : 0;
        if (dr) {
          return `M ${d.source.x},${d.source.y} C ${d.source.x-30},${d.source.y-30} ${d.source.x+30},${d.source.y-30} ${d.source.x},${d.source.y}`;
        }
        const r = 16;
        const l = Math.hypot(dx, dy);
        const nx = d.source.x + (dx * r / l);
        const ny = d.source.y + (dy * r / l);
        const tx = d.target.x - (dx * r / l);
        const ty = d.target.y - (dy * r / l);
        return `M ${nx},${ny} L ${tx},${ty}`;
      });

      linkLabel
        .attr('x', d => (d.source.x + d.target.x)/2)
        .attr('y', d => (d.source.y + d.target.y)/2 - 4);

      node.attr('transform', d => `translate(${d.x||0},${d.y||0})`);
    });
  }

  _renderCytoscape(container, j){
    const elements = [];
    const accept = new Set(j.ACEPTACION||[]);
    const estados = j.ESTADOS || [];
    const trans = j.TRANSICIONES || [];

    estados.forEach(id=>{
      elements.push({ data:{ id: String(id), label:String(id), accept: accept.has(id) ? 1 : 0 }});
    });
    trans.forEach(t=>{
      elements.push({ data:{ id: `${t.from}_${t.symbol}_${t.to}`, source:String(t.from), target:String(t.to), label:String(t.symbol)}});
    });

    const layoutMap = {
      auto: 'cose',
      force: 'cose',
      hierarchical: 'breadthfirst',
      circular: 'circle',
      grid: 'grid'
    };
    const layout = layoutMap[this.layout] || 'cose';

    this.cy = cytoscape({
      container,
      elements,
      style: [
        { selector:'node', style:{
          'background-color':'#eef3ff',
          'border-width':2, 'border-color':'#345',
          'label':'data(label)', 'text-valign':'center','color':'#223','font-size':12,
          'width':36,'height':36
        }},
        { selector:'node[accept = 1]', style:{
          'border-width':4, 'border-color':'#3a7'
        }},
        { selector:'edge', style:{
          'curve-style':'bezier', 'target-arrow-shape':'triangle',
          'line-color':'#99a', 'target-arrow-color':'#99a',
          'width':1.6, 'label':'data(label)', 'font-size':11, 'color':'#223'
        }}
      ],
      layout: { name: layout, animate: true, fit:true, padding:30 }
    });
  }

  async _renderGraphviz(container, j){
    const dot = this._buildDot(j);
    const svg = await this.viz.renderSVGElement(dot);
    svg.style.width = '100%';
    svg.style.height = '100%';
    container.appendChild(svg);
  }

  _fromObject(automaton){
    const ESTADOS = Array.from(automaton.states || []).map(s => s.id ?? s);
    const INICIO = automaton.startState?.id ?? automaton.startState ?? 0;
    const ACEPTACION = Array.from(automaton.acceptStates || []).map(s => s.id ?? s);
    const TRANSICIONES = [];
    (automaton.states || new Set()).forEach(st=>{
      const sid = st.id ?? st;
      if (st.transitions) {
        st.transitions.forEach((targets, sym)=>{
          (targets || []).forEach(t => TRANSICIONES.push({ from:sid, symbol:String(sym), to:(t.id??t) }));
        });
      }
      if (st.epsilonTransitions) {
        st.epsilonTransitions.forEach(t => TRANSICIONES.push({ from:sid, symbol:'ε', to:(t.id??t) }));
      }
    });
    const SIMBOLOS = [...new Set(TRANSICIONES.map(t=>t.symbol).filter(s=>s!=='ε'))];
    return { ESTADOS, SIMBOLOS, INICIO, ACEPTACION, TRANSICIONES };
  }

  _buildDot(j){
    const lines = [];
    lines.push('digraph Automata {');
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=circle, fontname="Inter,Arial"];');
    (j.ACEPTACION||[]).forEach(id => lines.push(`  "${id}" [shape=doublecircle];`));
    lines.push('  __start [shape=point, label=""];');
    lines.push(`  __start -> "${j.INICIO}";`);
    (j.TRANSICIONES||[]).forEach(t=>{
      lines.push(`  "${t.from}" -> "${t.to}" [label="${(t.symbol+'').replace(/"/g,'\\"')}"];`);
    });
    lines.push('}');
    return lines.join('\n');
  }
}
