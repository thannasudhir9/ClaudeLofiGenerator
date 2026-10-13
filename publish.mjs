import { readFile } from "node:fs/promises";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function publishToYouTube({ filePath, title, description, privacy }) {
  const token = process.env.YOUTUBE_ACCESS_TOKEN;
  if (!token) throw new Error("Set YOUTUBE_ACCESS_TOKEN (OAuth token with youtube.upload scope)");

  const buf = await readFile(filePath);
  const meta = {
    snippet: { title: title.slice(0, 100), description: description || "", categoryId: "10" },
    status: { privacyStatus: privacy || "private", selfDeclaredMadeForKids: false },
  };

  const init = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(buf.length),
      },
      body: JSON.stringify(meta),
    },
  );
  if (!init.ok) throw new Error(`YouTube init failed ${init.status}: ${await init.text()}`);

  const up = await fetch(init.headers.get("location"), {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body: buf,
  });
  if (!up.ok) throw new Error(`YouTube upload failed ${up.status}: ${await up.text()}`);
  const data = await up.json();
  return { id: data.id, url: `https://youtu.be/${data.id}` };
}

export async function publishToInstagram({ videoUrl, caption }) {
  const token = process.env.IG_ACCESS_TOKEN;
  const uid = process.env.IG_USER_ID;
  if (!token || !uid) throw new Error("Set IG_ACCESS_TOKEN and IG_USER_ID (Instagram Business/Creator account)");

  const create = await fetch(`${GRAPH}/${uid}/media`, {
    method: "POST",
    body: new URLSearchParams({ media_type: "REELS", video_url: videoUrl, caption: caption || "", access_token: token }),
  });
  const created = await create.json();
  if (!create.ok) throw new Error(`Instagram container failed: ${JSON.stringify(created)}`);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await fetch(`${GRAPH}/${created.id}?fields=status_code&access_token=${token}`);
    const sj = await s.json();
    if (sj.status_code === "FINISHED") break;
    if (sj.status_code === "ERROR" || sj.status_code === "EXPIRED") {
      throw new Error(`Instagram processing ${sj.status_code}`);
    }
    if (i === 59) throw new Error("Instagram processing timed out");
  }

  const pub = await fetch(`${GRAPH}/${uid}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: created.id, access_token: token }),
  });
  const pubj = await pub.json();
  if (!pub.ok) throw new Error(`Instagram publish failed: ${JSON.stringify(pubj)}`);
  return { id: pubj.id };
}
