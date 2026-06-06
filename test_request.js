async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/dev/logs');
    const logs = await res.json();
    console.log("=== LATEST SYSTEM LOGS ===");
    console.log(JSON.stringify(logs.slice(-20), null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
test();
