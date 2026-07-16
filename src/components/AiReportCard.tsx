import type { AiReport } from '../types'
import { Icon } from './Icon'

export function AiReportCard({ report, model }: { report: AiReport; model?: string | null }) {
  return <article className="ai-report panel-inset">
    <header><div className="ai-mark"><Icon name="brain" /></div><div><span className="eyebrow">AI LEARNING COACH</span><h3>温和但诚实的观察</h3></div>{model && <small>{model}</small>}</header>
    <p className="ai-summary">{report.summary}</p>
    <div className="ai-columns">
      <section><h4>这段时间做得好的</h4><ul>{report.wins.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
      <section><h4>可以观察的规律</h4><ul>{report.patterns.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
      {report.risks.length > 0 && <section><h4>值得留意</h4><ul>{report.risks.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
      <section><h4>下一步建议</h4><ul>{report.suggestions.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
    </div>
    <footer><Icon name="arrow" /><span>建议优先做：<strong>{report.next_focus}</strong></span></footer>
  </article>
}
