using Server.Modules.Documents.Repositories;
using Server.Modules.Documents.Repositories.Interfaces;
using Server.Modules.Documents.Services;
using Server.Modules.Documents.Services.Interfaces;

namespace Server.Modules.Documents;

public static class DocumentsModule
{
    public static IServiceCollection AddDocumentsModule(this IServiceCollection services)
    {
        services.AddScoped<IDocumentTemplateRepository, DocumentTemplateRepository>();
        services.AddScoped<IIssuedDocumentRepository, IssuedDocumentRepository>();

        services.AddScoped<IDocumentTemplateService, DocumentTemplateService>();
        services.AddScoped<IIssuedDocumentService, IssuedDocumentService>();

        return services;
    }
}
