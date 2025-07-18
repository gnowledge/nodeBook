import { getApiBase } from "../config";
import yaml from "js-yaml";

export async function listGraphsWithTitles(userId) {
  const res = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs`);
  const ids = await res.json();

  const graphList = await Promise.all(ids.map(async (id) => {
    try {
      const metaRes = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${id}/metadata.yaml`);
      const metaText = await metaRes.text();
      const meta = yaml.load(metaText);
      return { id, title: meta?.title || id };
    } catch {
      return { id, title: id };
    }
  }));

  return graphList;
}
