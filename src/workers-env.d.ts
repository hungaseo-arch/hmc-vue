// Workers 런타임 전역 중 DOM 타입에 없는 것. @cloudflare/workers-types 를 들이지 않고 필요한 만큼만 선언한다.
interface HTMLRewriterElement {
  setAttribute(name: string, value: string): void
  setInnerContent(content: string, options?: { html?: boolean }): void
  append(content: string, options?: { html?: boolean }): void
  before(content: string, options?: { html?: boolean }): void
}
declare class HTMLRewriter {
  on(selector: string, handlers: { element?(el: HTMLRewriterElement): void }): HTMLRewriter
  transform(res: Response): Response
}
