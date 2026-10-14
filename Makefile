.PHONY: dev build install clean

dev:
	bundle exec jekyll serve --livereload

build:
	bundle exec jekyll build

install:
	bundle install

clean:
	bundle exec jekyll clean
