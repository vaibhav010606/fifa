async function test() {
    const res = await fetch('https://fifa-5gdv.vercel.app/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] })
    });
    console.log("STATUS:", res.status);
    console.log("BODY:", await res.text());
}
test();
