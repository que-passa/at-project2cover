import { error, json } from "@sveltejs/kit";
import { loadProject } from "$lib/server/dumps";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  try {
    const project = await loadProject(params.id);
    return json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : "load failed";
    if (message === "invalid project id") error(400, message);
    error(404, "dump not found");
  }
};
