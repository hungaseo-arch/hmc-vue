// 임시 주소(hmc.hunga-seo.workers.dev)로 들어온 요청을 새 도메인 같은 경로로 301.
// 해시(#/경로)는 브라우저가 리다이렉트 뒤에도 유지하고, 새 사이트 라우터가 실경로로 바꾼다.
export default {
  fetch(request) {
    const url = new URL(request.url)
    return Response.redirect(`https://www.hanmaumch.id${url.pathname}${url.search}`, 301)
  },
}
