# Copyright 2015 Dietrich Epp.
#
# This file is part of Dash and the Jetpack Space Pirates.  The Dash
# and the Jetpack Space Pirates source code is distributed under the
# terms of the MIT license.  See LICENSE.txt for details.
from . import build
from . import version
from mako import template
import json
import os
import tempfile

class App(object):
    __slots__ = ['config', 'system']

    def __init__(self, config, system):
        self.config = config
        self.system = system

    def build(self):
        """Build (or rebuild) the application."""
        ver = version.get_version('.')

        shaders = list(build.all_files('shader', exts={'.vert', '.frag'}))
        self.system.build(
            'shader/all.js',
            self.shaders,
            args=(shaders,),
            deps=shaders)

        assets = {}
        with open('assets/images/Font.json', 'r') as fp:
            assets['Font'] = json.load(fp)
        self.build_images(assets, 'images')
        print(assets)

        # Top-level scripts.
        scripts = [
            self.system.build_module(
                'build/lodash.js',
                'lodash-cli',
                self.lodash_js),
            self.system.build_module(
                'build/howler.js',
                'howler',
                self.howler_js),
            self.system.build_module(
                'build/p2.js',
                'p2',
                self.p2_js),
            self.system.build(
                'build/app.js',
                self.app_js,
                deps=list(build.all_files('src', exts={'.js'})) + [
                    'shader/all.js'
                ],
                bust=True),
            self.system.build(
                'build/assets.js',
                self.assets_js,
                args=(json.dumps(assets, indent=2, sort_keys=True),),
                bust=True),
        ]

        # Top-level index.html file.
        self.system.build(
            'build/index.html',
            self.index_html,
            deps=[
                'static/index.mak',
                'static/style.css',
                'static/load.js',
            ],
            args=[scripts, ver])

    def build_images(self, assets, dirname):
        """Build images in a certain directory."""
        images = {}
        in_root = os.path.join('assets', dirname)
        out_root = os.path.join('build/assets', dirname)
        for path in build.all_files(in_root, exts={'.png', '.jpg'}):
            relpath = os.path.relpath(path, in_root)
            name = os.path.splitext(relpath)[0]
            out_path = self.system.copy(
                os.path.join(out_root, relpath),
                path,
                bust=True)
            out_rel = os.path.relpath(out_path, out_root)
            images[name] = out_rel
        assets[dirname] = images

    def shaders(self, paths):
        """Get the contents of the shader module."""
        shaders = {}
        for path in paths:
            name = os.path.relpath(path, 'shader')
            with open(path) as fp:
                shaders[name] = fp.read()
        return ('module.exports = {};\n'
                .format(json.dumps(shaders, indent=2, sort_keys=True))
                .encode('UTF-8'))

    def lodash_js(self):
        """Get the contents of the lodash.js package."""
        with tempfile.TemporaryDirectory() as path:
            build.run_pipe(
                ['./node_modules/.bin/lodash',
                 'modern', '-o', os.path.join(path, 'lodash.js')])
            with open(os.path.join(path, 'lodash.min.js'), 'rb') as fp:
                return fp.read()

    def howler_js(self):
        """Get the contents of the howler.js package."""
        with open('./node_modules/howler/howler.min.js', 'rb') as fp:
            return fp.read()

    def p2_js(self):
        """Get the contents of the p2.js package."""
        with open('node_modules/p2/build/p2.min.js', 'rb') as fp:
            return fp.read()

    def app_js(self):
        """Get the contents of the main application JavaScript code."""
        return build.minify_js(
            self.config,
            build.browserify(self.config, ['./src/app']))

    def assets_js(self, assets):
        """Get the contents of the assets.js file."""
        return build.minify_js(
            self.config,
            'window.AssetInfo = {}\n'.format(assets).encode('UTF-8'))

    def index_css(self):
        """Get the main CSS styles."""
        with open('static/style.css', 'rb') as fp:
            data = fp.read()
        return build.minify_css(self.config, data).decode('UTF-8')

    def index_js(self, scripts):
        """Get the JavaScript loader code."""
        with open('static/load.js') as fp:
            data = fp.read()
        scripts = [os.path.relpath(path, 'build/') for path in scripts]
        return build.minify_js(
            self.config,
            data.replace(
                'var SCRIPTS = [];',
                'var SCRIPTS = {};'.format(
                    json.dumps(scripts, separators=(',', ':'))))
            .encode('UTF-8')).decode('UTF-8')

    def index_html(self, scripts, ver):
        """Get the main HTML page."""
        def relpath(path):
            return os.path.relpath(path, 'build/')
        tmpl = template.Template(filename='static/index.mak')
        data = tmpl.render(
            relpath=relpath,
            scripts=scripts,
            css_data=self.index_css(),
            js_data=self.index_js(scripts),
            app_name='Jetpack Every Day',
            version=ver,
        )
        return build.minify_html(self.config, data.encode('UTF-8'))
