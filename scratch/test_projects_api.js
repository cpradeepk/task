async function testApi() {
  try {
    const res = await fetch('http://localhost:3000/api/projects?type=main');
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Projects count:', json.length);
    if (json.length > 0) {
      console.log('First project:', json[0]);
    }
  } catch (err) {
    console.error('API call failed:', err.message);
  }
}

testApi();
