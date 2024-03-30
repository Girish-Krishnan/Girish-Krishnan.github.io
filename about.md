---
layout: default
title: About
permalink: /about/
---

# Welcome to My Portfolio

Here you can find information about my projects, skills, and experience.

## My Skills

{% for skill_category in site.data.skills %}
### {{ skill_category.name }}
{% for item in skill_category.items %}
- {{ item }}
{% endfor %}
{% endfor %}
