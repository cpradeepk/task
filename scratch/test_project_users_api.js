async function testApi() {
  try {
    const res = await fetch('http://localhost:3000/api/projects/PRJ-037/users');
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Success:', json.success);
    if (json.success && json.data) {
      console.log('Users count:', json.data.length);
      if (json.data.length > 0) {
        console.log('First user:', json.data[0]);
      }
    } else {
      console.log('Error:', json.error);
    }
  } catch (err) {
    console.error('API call failed:', err.message);
  }
}

testApi();
