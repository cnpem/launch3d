module.exports = {
    hooks: {
      readPackage: (pkg) => {
        delete pkg.optionalDependencies['cpu-features']
        return pkg
      }
    }
  }