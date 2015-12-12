<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${app_name|h}</title>
    <style type="text/css">${css_data|h}</style>
  </head>
  <body>
    <div id="main">
      <div id="game"></div>
      <p id="version">${version|h}</p>
    </div>
    <div id="instructions">
      <h1>${app_name|h}</h1>
      <p>
	Fight your way out of the space pirate lair!
      </p>
      <h3>Controls</h3>
      <ul class="controls">
	<li><span>Mouse:</span> aim and fire</li>
	<li><span>Space:</span> jetpack</li>
      </ul>
    </div>
    <script type="text/javascript">${js_data}</script>
  </body>
</html>
