export async function sendJson(url: string, method: string, csrf: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrf,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (response.status === 401) {
    window.location.assign('/login')
    throw new Error('Chưa đăng nhập.')
  }
  if (!response.ok) throw new Error(data.error || 'Không thực hiện được.')
  return data
}

export async function sendForm(url: string, csrf: string, body: FormData) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'x-csrf-token': csrf },
    body,
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (response.status === 401) {
    window.location.assign('/login')
    throw new Error('Chưa đăng nhập.')
  }
  if (!response.ok) throw new Error(data.error || 'Không thực hiện được.')
  return data
}
