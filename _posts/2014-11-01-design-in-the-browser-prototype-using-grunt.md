---
layout: post

title: How I design in the browser and how you can too

excerpt: I share my approach to prototyping and designing in the browser. Read on to use my starter kit for your next project. 

fullimage:
  src: /assets/design_code_stock.jpg
  alt: Prototype and Design
  position: center

tags:
- Markup
- Prototying
- Grunt

meta:
  title: Design and Prototype in the browser using Grunt and Livereload
  keywords: HTML, CSS, Grunt, Sass, Livereload, Codekit, Prototype, Prototype in the browser, Design in the browser, Grunt with Livereload, HTML CSS Prototyping, Prototype with JSON and Grunt
  description: Design and Prototype using HTML, CSS, Sass, JSON with Grunt in your browser with style injection and live reload

---

Writing markup to translate designs into code is a time consuming process. It is not uncommon to have the designs completed before coding even begins. This approach has served us well until now.

## Design is ongoing

I have found myself going back to the drawing board to come up with a new approach often, not only does this adds to the time but discarding previous code is not the most pleasant experience. 

The continuous feedback from various channels - data analytics, usage statistics and feature enhancements demands a cohesive effort to make refinements and tweaks to the design. The buildup of unforeseen changes in code often leads to increased development time specially when different teams have to be mobilised to work together.

It makes sense to design in the browser which reduces the friction between a design & prototype. Essentially, one can design in code. A prototyping process thus becomes essential where you can think freely and execute them as you go. 

## Wireframes over designs

A project, feature, screen; regardless of the task at hand requires structure in content and the hierarchy in elements that will compose it. A Wireframes thus helps establish the preference order and its priority.

Designs change. Moreover, a design may include visual elements of style and aesthetics that are more prone to changes due to their subjective nature. Personal tastes and preferences of the people involved with the project also effects the final outcomes. 

A Wireframe on the other hand conveys meaningful information unaffected by visual ornaments. 

I've myself successfully followed this approach on both personal projects and at work. The result is encouraging. 

## The approach to prototyping

Web Applications can benefit immensely from prototyping. The HTML, CSS, JS is compiled on runtime using one of the various templating languages (for markup) and pre-processors (for CSS) and injected in your browsing as you proceed. 

- Create components for common widgets both in HTML and CSS.
- Use any client of server side templating (Twig, Liquid, Swig, EJB, Jade, Handlebars etc) to create modular and maintainable markup ready for production. 
- Use any pre-processor (Sass, Less, Stylus etc) to compile your stylesheets
- Use API stubs with temporary JSON data for your components. 
- Inject HTML/CSS/JS instantly as you code your designs ready with the required data without dummy placeholders. 
- Continuous testing for every device with auto-refresh on desktop, mobile and tablets

## Starter Kit - Use mine!

I am hesitant to recommend any particular framework since every project is unique and the amount of time that goes into learning the framework negates the benefit. Sometimes customisation and extending the framework might need some more time investment of time. Documentation may be missing or incomplete. 

The best ways to create a prototype is to use raw technologies and weave together a workable structure that works for you and your project. I recommend using Grunt to automate your workflow. 

I released my own [Prototyping starter kit](https://github.com/vaibhavkanwal/PrototypingOnSteroids) earlier, aptly named - [Prototyping on Steroids.](http://vaibhavkanwal.github.io/PrototypingOnSteroids/)

Feel free to use, distribute and modify it. I am keen to know how it benefits your prototyping process. 
Any suggestions and fork requests are welcome! 

_The source is provided on Github. I am actively adding more features as I use and improve this for my own personal and side projects. I use the said workflow at work and for my side projects. If you encounter any bugs, please file a issue request on Github._

