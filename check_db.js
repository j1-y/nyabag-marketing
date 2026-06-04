/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

const url = "https://vydawrbigmlhijpdnbgf.supabase.co";
const key = "sb_publishable_ckEQBH29bbSYTAKkbmAr7w_XUjxBsHJ";
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from("bookmarks").select("*");
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  console.log("Data:", data);
}

check();
