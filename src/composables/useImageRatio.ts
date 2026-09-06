/*
  이미지가 들어갈 자리를 미리 잡아 화면 밀림(CLS)을 없앤다.

  상세 페이지 갤러리는 <img> 에 크기가 없어서, 사진이 도착할 때마다 아래
  내용이 통째로 밀려 내려갔다. 앨범 한 개에 사진이 수십 장이라 스크롤 중에
  계속 흔들린다.

  Storage 에는 가로·세로가 없다(metadata 는 size·mimetype 뿐). 801장을 전부
  받아 헤더를 읽어 DB 에 적는 방법도 있지만, 그 전에 공짜로 되는 것부터 한다.

  - 처음 보는 사진: fallback 비율로 상자를 잡는다. 밀림은 없고, 비율이 다르면
    위아래(또는 좌우)에 여백이 생긴다.
  - 로드되면 진짜 비율을 localStorage 에 적어 둔다.
  - 다음 방문: 적어 둔 비율로 상자를 잡으므로 여백도 사라진다.

  적어 둔 값을 지금 화면에 바로 반영하지 않는 것이 요점이다. 보고 있는 도중에
  상자 크기를 바꾸면 그것이 곧 우리가 없애려던 밀림이다. 그래서 화면에
  들어올 때 값을 한 번 복사해 고정하고, 새로 배운 값은 다음 방문용으로만 쌓는다.
*/

const STORE_KEY = 'hmc:image-ratio'

function loadStore(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    // 사생활 보호 모드 등으로 localStorage 를 못 쓰면 그냥 fallback 으로 간다.
    return {}
  }
}

const store: Record<string, number> = loadStore()
let saveTimer: ReturnType<typeof setTimeout> | undefined

/** 서명 URL 은 토큰이 매번 바뀐다. 경로만 남겨야 같은 사진으로 알아본다. */
function keyOf(src: string): string {
  try {
    return new URL(src, location.origin).pathname
  } catch {
    return src
  }
}

export function useImageRatio(fallback: number) {
  // 이 화면이 사는 동안 고정할 값. 반응형이 아니라서 도중에 안 흔들린다.
  const fixed: Record<string, number> = { ...store }

  /** 자리를 잡을 바깥 상자에 건다. 사진마다 추정 비율이 다르면 override 로 넘긴다. */
  function boxStyle(src: string, override?: number) {
    return { aspectRatio: String(fixed[keyOf(src)] ?? override ?? fallback) }
  }

  /** <img @load> 에 건다. 다음 방문에 쓸 비율을 적어 둔다. */
  function remember(src: string, e: Event) {
    const img = e.target as HTMLImageElement
    if (!img.naturalWidth || !img.naturalHeight) return

    const ratio = Math.round((img.naturalWidth / img.naturalHeight) * 1000) / 1000
    const key = keyOf(src)
    if (store[key] === ratio) return
    store[key] = ratio

    // 사진 수십 장이 한꺼번에 로드되므로 쓰기를 한 번으로 모은다.
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(store))
      } catch {
        // 용량이 찼으면 다음 방문에 여백이 좀 생길 뿐이라 그냥 넘어간다.
      }
    }, 500)
  }

  return { boxStyle, remember }
}
