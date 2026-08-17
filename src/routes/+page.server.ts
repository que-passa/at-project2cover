import { listDumps } from "$lib/server/dumps";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const projects = await listDumps();
  return { projects };
};
