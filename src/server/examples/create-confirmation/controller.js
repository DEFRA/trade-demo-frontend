export const createConfirmationController = {
  handler(request, h) {
    const { id } = request.query

    if (!id) {
      return h.redirect('/examples')
    }

    return h.view('examples/create-confirmation/index', {
      pageTitle: 'Example created',
      heading: 'Example created',
      exampleId: id
    })
  }
}
