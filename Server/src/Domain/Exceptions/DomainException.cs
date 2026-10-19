namespace Server.Domain.Exceptions;

/// <summary>Vi phạm quy tắc nghiệp vụ bên trong entity.</summary>
public class DomainException(string message) : Exception(message);
