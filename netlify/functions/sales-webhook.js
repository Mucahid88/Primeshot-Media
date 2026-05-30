exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const data = JSON.parse(event.body);
    const provision = data.price ? Math.round(data.price * 0.15) : 0;

    if (process.env.MAKE_WEBHOOK_URL) {
      await fetch(process.env.MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, provision })
      });
    }

    if (data.type === 'SALG' && process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID) {
      await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          parent: { database_id: process.env.NOTION_DATABASE_ID },
          properties: {
            'Virksomhed': { title: [{ text: { content: data.detail || 'Ukendt' } }] },
            'Salgskonsulent': { rich_text: [{ text: { content: data.user || 'Ukendt' } }] },
            'Pris (DKK)': { number: data.price || 0 },
            'Provisionsudbetaling': { rich_text: [{ text: { content: provision + ' kr.' } }] },
            'Salgsdato': { date: { start: new Date().toISOString().split('T')[0] } },
            'Pipeline-status': { select: { name: 'Lukket salg' } }
          }
        })
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, provision: provision + ' kr.' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
