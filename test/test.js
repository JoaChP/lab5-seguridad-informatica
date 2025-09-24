// test/test.js
const assert = require('assert');
const val = require('../libs/unalib');

describe('unalib', function () {

  // -----------------------------
  // is_valid_phone
  // -----------------------------
  describe('funcion is_valid_phone', function () {
    it('deberia devolver true para 8297-8547', function () {
      assert.strictEqual(val.is_valid_phone('8297-8547'), true);
    });

    it('deberia devolver false para 8297p-8547', function () {
      assert.strictEqual(val.is_valid_phone('8297p-8547'), false);
    });

    it('deberia aceptar formatos internacionales +506 2222-3333', function(){
      assert.strictEqual(val.is_valid_phone('+506 2222-3333'), true);
    });
  });

  // -----------------------------
  // is_valid_url_image
  // -----------------------------
  describe('funcion is_valid_url_image', function () {
    it('true para .jpg http', function () {
      assert.strictEqual(val.is_valid_url_image('http://image.com/image.jpg'), true);
    });

    it('true para .gif http', function () {
      assert.strictEqual(val.is_valid_url_image('http://image.com/image.gif'), true);
    });

    it('true para .png con querystring', function () {
      assert.strictEqual(val.is_valid_url_image('https://x.y/img.png?size=large&v=1'), true);
    });

    it('true para data:image;base64', function () {
      const data = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';
      assert.strictEqual(val.is_valid_url_image(data), true);
    });

    it('true para Google Images con ?imgurl=', function () {
      const g = 'https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fi.jpg&h=200&w=300';
      assert.strictEqual(val.is_valid_url_image(g), true);
    });

    it('true para Bing con ?mediaurl=', function () {
      const b = 'https://www.bing.com/images/search?view=detailV2&mediaurl=https%3a%2f%2fsite.com%2fph.png';
      assert.strictEqual(val.is_valid_url_image(b), true);
    });

    it('true para thumbnails mm.bing.net sin extension', function () {
      const t = 'https://tse4.mm.bing.net/th/id/OIP.abcd1234';
      assert.strictEqual(val.is_valid_url_image(t), true);
    });

    it('false para .txt', function () {
      assert.strictEqual(val.is_valid_url_image('http://image.com/file.txt'), false);
    });
  });

  // -----------------------------
  // is_valid_yt_video
  // -----------------------------
  describe('funcion is_valid_yt_video', function () {
    it('true para youtube watch?v=', function () {
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/watch?v=YE7VzlLtp-4'), true);
    });

    it('true para youtu.be corto', function () {
      assert.strictEqual(val.is_valid_yt_video('https://youtu.be/YE7VzlLtp-4'), true);
    });

    it('true para youtube embed', function () {
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/embed/YE7VzlLtp-4'), true);
    });

    it('true para youtube shorts', function () {
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/shorts/YE7VzlLtp-4'), true);
    });

    it('true para playlist (sin id) usando parse interno', function(){
      assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/playlist?list=PL9bw4S5ePsEFpW9qLw'), true);
    });

    it('false para imagen', function () {
      assert.strictEqual(val.is_valid_yt_video('http://image.com/image.jpg'), false);
    });
  });

  // -----------------------------
  // parseYouTube
  // -----------------------------
  describe('parseYouTube', function(){
    it('extrae id de watch + t=1m30s', function(){
      const r = val.parseYouTube('https://www.youtube.com/watch?v=YE7VzlLtp-4&t=1m30s');
      assert.ok(r);
      assert.strictEqual(r.id, 'YE7VzlLtp-4');
      assert.strictEqual(r.list, null);
      assert.strictEqual(r.start, 90);
    });

    it('extrae id de youtu.be + t=45', function(){
      const r = val.parseYouTube('https://youtu.be/YE7VzlLtp-4?t=45');
      assert.ok(r);
      assert.strictEqual(r.id, 'YE7VzlLtp-4');
      assert.strictEqual(r.start, 45);
    });

    it('playlist sola (videoseries) devuelve list y no id', function(){
      const r = val.parseYouTube('https://www.youtube.com/playlist?list=PL9bw4S5ePsEFpW9qLw');
      assert.ok(r);
      assert.strictEqual(r.id, null);
      assert.ok(!!r.list);
    });

    it('devuelve null para URL no Youtube', function(){
      const r = val.parseYouTube('https://example.com/watch?v=YE7VzlLtp-4');
      assert.strictEqual(r, null);
    });
  });

  // -----------------------------
  // validateMessage
  // -----------------------------
  describe('validateMessage', function () {

    it('clasifica imagen http y NO duplica texto cuando el mensaje es solo la URL', function(){
      const raw = JSON.stringify({ nombre:'A', mensaje:'http://x.com/a.png', color:'#000' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'image');
      assert.strictEqual(out.url, 'http://x.com/a.png');
      assert.strictEqual(out.mensaje, '');
    });

    it('clasifica data:image;base64 y NO duplica texto', function(){
      const data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      const raw  = JSON.stringify({ nombre:'B', mensaje:data, color:'#000' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'image');
      assert.strictEqual(out.url, data);
      assert.strictEqual(out.mensaje, '');
    });

    it('extrae ?imgurl= de Google Images y NO duplica texto', function(){
      const g = 'https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fi.jpg&h=200&w=300';
      const raw = JSON.stringify({ nombre:'C', mensaje:g, color:'#111' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'image');
      assert.strictEqual(out.url, 'https://example.com/i.jpg');
      assert.strictEqual(out.mensaje, '');
    });

    it('detecta thumbnail mm.bing.net como imagen', function(){
      const t = 'https://tse2.mm.bing.net/th/id/OIP.abcd1234';
      const raw = JSON.stringify({ nombre:'C2', mensaje:t, color:'#222' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'image');
      assert.strictEqual(out.url, t);
    });

    it('clasifica YouTube (watch) y NO duplica texto', function(){
      const url = 'https://www.youtube.com/watch?v=YE7VzlLtp-4';
      const raw = JSON.stringify({ nombre:'D', mensaje:url, color:'#111' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'video');
      assert.ok(/youtu/.test(out.url));
      assert.strictEqual(out.mensaje, '');
      assert.ok(out.yt && out.yt.id === 'YE7VzlLtp-4');
    });

    it('clasifica YouTube con start y playlist (watch?v=&list=&t=)', function(){
      const url = 'https://www.youtube.com/watch?v=YE7VzlLtp-4&list=PLabc123&t=1m5s';
      const raw = JSON.stringify({ nombre:'E', mensaje:url, color:'#333' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'video');
      assert.ok(out.yt);
      assert.strictEqual(out.yt.id, 'YE7VzlLtp-4');
      assert.strictEqual(out.yt.list, 'PLabc123');
      assert.strictEqual(out.yt.start, 65);
    });

    it('playlist sola (sin id) -> type video, yt.list presente', function(){
      const url = 'https://www.youtube.com/playlist?list=PL9bw4S5ePsEFpW9qLw';
      const raw = JSON.stringify({ nombre:'F', mensaje:url, color:'#444' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'video');
      assert.ok(out.yt);
      assert.strictEqual(out.yt.id, null);
      assert.ok(!!out.yt.list);
    });

    it('XSS en texto aparece escapado y sin url', function(){
      const xss = JSON.stringify({ nombre:'G', mensaje:'<img src=x onerror="alert(1)">', color:'#000' });
      const out = JSON.parse(val.validateMessage(xss));
      assert.strictEqual(out.type, 'text');
      assert.strictEqual(out.url, null);
      assert.ok(out.mensaje.includes('&lt;img'));
      assert.ok(!out.mensaje.includes('<img'));
    });

    it('texto normal sin URLs -> type text', function(){
      const raw = JSON.stringify({ nombre:'H', mensaje:'hola mundo', color:'#000' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'text');
      assert.strictEqual(out.url, null);
      assert.strictEqual(out.mensaje, 'hola mundo');
    });

    it('texto + URL de imagen mezclados -> type image y mantiene el texto (no es URL sola)', function(){
      const raw = JSON.stringify({ nombre:'I', mensaje:'mira esto https://site.com/foto.jpg genial', color:'#000' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'image');
      assert.strictEqual(out.url, 'https://site.com/foto.jpg');
      // mantiene el texto porque no es exactamente igual a la URL
      assert.ok(out.mensaje.startsWith('mira esto'));
    });

    it('texto + URL de YouTube mezclados -> type video y mantiene el texto', function(){
      const raw = JSON.stringify({ nombre:'J', mensaje:'video -> https://youtu.be/YE7VzlLtp-4', color:'#000' });
      const out = JSON.parse(val.validateMessage(raw));
      assert.strictEqual(out.type, 'video');
      assert.ok(out.yt && out.yt.id === 'YE7VzlLtp-4');
      assert.ok(out.mensaje.includes('video -&gt; ')); // escapado
    });

    it('maneja entrada no JSON devolviendo texto escapado', function(){
      const out = JSON.parse(val.validateMessage('<script>alert(1)</script>'));
      assert.strictEqual(out.type, 'text');
      assert.ok(out.mensaje.includes('&lt;script&gt;'));
    });
  });

});
