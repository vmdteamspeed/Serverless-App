---
to: "ui/src/stories/<%= h.changeCase.lower(name) %>page.stories.js"
---
import React from 'react';

import <%= h.capitalize(name) %>Page from '../pages/<%= h.changeCase.lower(name) %>page';

export default {
    title: 'Pages/<%= h.capitalize(name) %> Page',
    component: <%= h.capitalize(name) %>Page,
};

const Template = (args) => <<%= h.capitalize(name) %>Page {...args} />;

export const Base = Template.bind({});