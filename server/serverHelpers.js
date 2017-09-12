function serverError(res, error) {
    return res.status(500).json({
        errorMessage: 'Error while processing query',
        error
    });
}

module.exports = {
    serverError
};