# generator-jhipster-quota
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
> [JHipster module] This module allows you to create entities that allow you to manage an entity creation quota for each user. All you will have to do is enter a quota for each user directly into the database. If you do not enter a quota, it will be basic unlimited for each user.

# Introduction

This is a [JHipster](http://jhipster.github.io/) module, that is meant to be used in a JHipster application. This module allows you to create entities that allow you to manage an entity creation quota for each user. All you will have to do is enter a quota for each user directly into the database. If you do not enter a quota, it will be basic unlimited for each user.

New entities, Quota[Entity], will be created so that you can add a quota to certain users.
The entities which will now have a quota have their Resource.java file modified to check the quota of the users.

You can find a sample application using this generator [here](https://github.com/contribution-jhipster-uga/sample-application-quota)

# Prerequisites

As this is a [JHipster](http://jhipster.github.io/) module, we expect you have JHipster and its related tools already installed:

- [Installing JHipster](https://jhipster.github.io/installation.html)

You must have allowed auditing on the entities to have a field createdBy for those you want to put a quota on.
To do it easily you can use this [generator](https://github.com/hipster-labs/generator-jhipster-entity-audit).

# Installation

## With Yarn

To install this module:

```bash
yarn global add generator-jhipster-quota
```

To update this module:

```bash
yarn global upgrade generator-jhipster-quota
```

## With NPM

To install this module:

```bash
npm install -g generator-jhipster-quota
```

To update this module:

```bash
npm update -g generator-jhipster-quota
```

# Usage

First, you have to run the generator using the following command :

```bash
yo jhipster-quota
```

It will generate new entities and then ask you if you want to overwrite some files. You must overwrite every files for the quotas to work correctly.

Now that every file and entities have been created. You can run the application with :
```bash
./mvnw
```
And go to the quota entities pages to create new quota for users.

# License

MIT © [Contribution Jhipster UGA](https://github.com/contribution-jhipster-uga)
Julien COURTIAL, Hugo GROS-DAILLON, Cédric LAFRASSE et Bastien TERRIER.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[npm-image]: https://img.shields.io/npm/v/generator-jhipster-quota.svg
[npm-url]: https://npmjs.org/package/generator-jhipster-quota
[travis-image]: https://travis-ci.org/contribution-jhipster-uga/generator-jhipster-quota.svg?branch=master
[travis-url]: https://travis-ci.org/contribution-jhipster-uga/generator-jhipster-quota
[daviddm-image]: https://david-dm.org/contribution-jhipster-uga/generator-jhipster-quota.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/contribution-jhipster-uga/generator-jhipster-quota
