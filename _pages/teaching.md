---
layout: page
title: teaching
permalink: /teaching/
description:
nav: true
nav_order: 4
display_categories: [Electrical and Computer Engineering (ECE), Computer Science and Engineering (CSE), Cognitive Science (COGS), Mathematics (MATH), Physics (PHYS), Engineering (ENG)]
horizontal: false
---

<p>I was fortunate to be a teaching assistant for several courses at UCSD, where I had the opportunity to work with some of the brightest minds in engineering, computer science, math, physics, and other interdisciplinary fields. </p>

<p>My teaching evaluations can be found in <a href="https://drive.google.com/drive/folders/1-rVGUkRIBWbpBR-cdf4USOVdJX1XFFWW?usp=sharing">this Google Drive folder</a>.</p>

<!-- pages/teaching.md -->
<div class="projects">
{% if site.enable_project_categories and page.display_categories %}
  <!-- Display categorized projects -->
  {% for category in page.display_categories %}
  <a id="{{ category }}" href=".#{{ category }}">
    <h2 class="test">{{ category }}</h2>
  </a>
  {% assign categorized_projects = site.projects | where: "category", category %}
  {% assign sorted_projects = categorized_projects | sort: "importance" %}
  <!-- Generate cards for each project -->
  {% if page.horizontal %}
  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
  {% endfor %}

{% else %}

<!-- Display projects without categories -->

{% assign sorted_projects = site.projects | sort: "importance" %}

  <!-- Generate cards for each project -->

{% if page.horizontal %}

  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
{% endif %}
</div>
