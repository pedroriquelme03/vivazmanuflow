export type VolumeNome = { rotulo: string; valor: number };
export type HoraVolume = { hora: number; total: number };

export function volumeLocaisDigitados(
  porSublocal: { local: string; total: number }[] | null | undefined,
): VolumeNome[] {
  return (porSublocal ?? [])
    .filter((item) => item.total > 0)
    .map((item) => ({
      rotulo: item.local?.trim() || "Sem local informado",
      valor: item.total,
    }));
}

export function picoHorario(itens: HoraVolume[]) {
  if (itens.length === 0) return null;
  const top = itens.reduce((acc, item) =>
    item.total > acc.total ? item : acc,
  );
  if (top.total <= 0) return null;
  return top;
}

export function horasDoDia(itens: HoraVolume[]): HoraVolume[] {
  const mapa = new Map(itens.map((i) => [i.hora, i.total]));
  return Array.from({ length: 24 }, (_, hora) => ({
    hora,
    total: mapa.get(hora) ?? 0,
  }));
}
