async function extractErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (data?.error) return data.error;
  } catch {
    // corpo não é JSON, usa o texto puro mesmo
  }
  return text || `Erro ${res.status}`;
}

export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
