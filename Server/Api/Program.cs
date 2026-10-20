using Server.Api.Extensions;
using Server.Api.Middlewares;
using Server.Gateway;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddGateway(builder.Configuration)
    .AddData(builder.Configuration)
    .AddModules()
    .AddApiControllers();

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
