using Server.Api.Extensions;
using Server.Api.Gateway;
using Server.Api.Middlewares;
using Server.Application;
using Server.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddGateway(builder.Configuration)
    .AddApplication()
    .AddInfrastructure(builder.Configuration)
    .AddApi();

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseGateway();

app.MapControllers();

app.Run();
